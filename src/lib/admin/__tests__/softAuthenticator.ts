// A software WebAuthn authenticator for tests: an ES256 key in node:crypto that
// answers create() and get() the way a passkey provider does, so the REAL
// verification code runs end to end. No browser, no network.
import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';

const b64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');
const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest();

export interface SoftOptions {
  /** Synced passkeys (iCloud, Google) report BE=1 BS=1 and a counter that stays 0. */
  synced?: boolean;
  userVerified?: boolean;
}

export class SoftAuthenticator {
  readonly credentialId = randomBytes(32);
  private readonly privateKey: KeyObject;
  private readonly cosePublicKey: Uint8Array;
  private counter = 0;
  private readonly synced: boolean;
  private readonly uv: boolean;
  userHandle: string | undefined;

  constructor(opts: SoftOptions = {}) {
    this.synced = opts.synced ?? true;
    this.uv = opts.userVerified ?? true;
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.privateKey = privateKey;
    const jwk = publicKey.export({ format: 'jwk' });
    // COSE_Key, EC2 / ES256 / P-256 (RFC 9053): {1:2, 3:-7, -1:1, -2:x, -3:y}
    const cose = new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, new Uint8Array(Buffer.from(jwk.x!, 'base64url'))],
      [-3, new Uint8Array(Buffer.from(jwk.y!, 'base64url'))],
    ]);
    this.cosePublicKey = isoCBOR.encode(cose);
  }

  private flags(attested: boolean): number {
    let f = 0x01; // UP
    if (this.uv) f |= 0x04;
    if (this.synced) f |= 0x08 | 0x10; // BE + BS
    if (attested) f |= 0x40; // AT
    return f;
  }

  private authData(rpId: string, attested: boolean): Buffer {
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.synced ? 0 : ++this.counter);
    const head = Buffer.concat([sha256(rpId), Buffer.from([this.flags(attested)]), counter]);
    if (!attested) return head;
    const idLen = Buffer.alloc(2);
    idLen.writeUInt16BE(this.credentialId.length);
    return Buffer.concat([head, Buffer.alloc(16) /* aaguid: zeros, as "none" attestation gives */, idLen, this.credentialId, this.cosePublicKey]);
  }

  private clientData(type: 'webauthn.create' | 'webauthn.get', challenge: string, origin: string): Buffer {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }

  /** navigator.credentials.create() + @simplewebauthn/browser's JSON shape. `origin` is what the BROWSER would report. */
  create(optionsJSON: { challenge: string; rp: { id?: string }; user: { id: string } }, origin: string, rpIdOverride?: string) {
    const rpId = rpIdOverride ?? optionsJSON.rp.id!;
    this.userHandle = optionsJSON.user.id;
    const authData = this.authData(rpId, true);
    const attestationObject = isoCBOR.encode(
      new Map<string, unknown>([
        ['fmt', 'none'],
        ['attStmt', new Map()],
        ['authData', new Uint8Array(authData)],
      ]) as never,
    );
    const id = b64u(this.credentialId);
    return {
      id,
      rawId: id,
      type: 'public-key' as const,
      response: {
        clientDataJSON: b64u(this.clientData('webauthn.create', optionsJSON.challenge, origin)),
        attestationObject: b64u(attestationObject),
        transports: ['internal', 'hybrid'],
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform' as const,
    };
  }

  /** navigator.credentials.get(). */
  get(optionsJSON: { challenge: string; rpId?: string }, origin: string, rpIdOverride?: string) {
    const rpId = rpIdOverride ?? optionsJSON.rpId!;
    const authData = this.authData(rpId, false);
    const clientDataJSON = this.clientData('webauthn.get', optionsJSON.challenge, origin);
    // ES256 assertion signatures are ASN.1 DER — node's default for EC keys.
    const signature = sign('sha256', Buffer.concat([authData, sha256(clientDataJSON)]), this.privateKey);
    const id = b64u(this.credentialId);
    return {
      id,
      rawId: id,
      type: 'public-key' as const,
      response: {
        clientDataJSON: b64u(clientDataJSON),
        authenticatorData: b64u(authData),
        signature: b64u(signature),
        userHandle: this.userHandle,
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform' as const,
    };
  }
}
