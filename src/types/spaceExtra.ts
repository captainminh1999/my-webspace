export interface MarsPhoto {
  id: number;
  img_src: string;
  camera: string;
  rover: string;
}

export interface MarsPhotoData {
  photos: MarsPhoto[];
}

export interface EpicData {
  date: string;
  image: string;
  caption: string;
  url: string;
}

export interface MarsWeatherData {
  sol_keys: string[];
  latest: {
    sol: string;
    AT: number;
    HWS: number;
    PRE: number;
  };
}
