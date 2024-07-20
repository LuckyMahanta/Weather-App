export interface WeatherData {
    weather: [
      {
        main: string;
        description: string;
      }
    ];
    main: {
      temp: number;
      humidity: number;
    };
    wind: {
      speed: number;
    };
    sys: {
      country: string;
    };
    name: string;
  }
  