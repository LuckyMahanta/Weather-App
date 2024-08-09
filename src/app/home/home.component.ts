import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { WeatherService } from '../services/weather.service';
import { WeatherData } from '../models/weather.model';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  weatherData?: WeatherData;
  currentTemp!: number;
  cityName: string = '';
  country?: string;
  description?: string;
  weatherImageUrl: string = '';
  error: string = '';
  isRainImage: boolean = false;
  weatherHistory: any[] = [];
  latitude: number = 0;
  longitude: number = 0;
  private weatherSubscription?: Subscription;
  backgroundClass: string = 'default-background';
  private searchSubject: Subject<string> = new Subject<string>();

  constructor(
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      const sessionFlag = sessionStorage.getItem('sessionActive');
      if (!sessionFlag) {
        this.clearWeatherHistory();
        sessionStorage.setItem('sessionActive', 'true');
      }
    }

    this.loadWeatherHistory();

    this.searchSubject.pipe(
      debounceTime(1000),
      distinctUntilChanged()
    ).subscribe(cityName => {
      if (cityName.trim() !== '') {
        this.getWeatherByCity(cityName);
      }
    });

    this.route.params.subscribe(params => {
      if (params['city']) {
        const cityName = params['city'].trim();
        this.cityName = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
        this.getWeatherByCity(this.cityName);
      } else {
        this.getLocation();
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribeWeather();
  }

  getLocation() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          this.latitude = position.coords.latitude;
          this.longitude = position.coords.longitude;
          this.getWeatherByCoordinates();
        },
        error => {
          console.log("Error getting location:", error);
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }

  getWeatherByCoordinates() {
    this.unsubscribeWeather();
    this.weatherSubscription = this.weatherService.getWeatherByCoordinates(this.latitude, this.longitude)
      .subscribe(
        response => {
          this.weatherData = response;
          this.setAllData(response);
          this.updateSearchHistory(response, response.name);
          
          this.router.navigate(['/home', response.name.split(',')[0].trim()]);
        },
        error => {
          console.log("Error fetching weather by coordinates", error);
          this.handleWeatherError(error);
        }
      );
  }

  getWeatherByCity(cityName: string) {
    this.unsubscribeWeather();
    this.weatherSubscription = this.weatherService.getWeatherByCity(cityName)
      .subscribe(
        response => {
          this.weatherData = response;
          this.setAllData(response);
          this.updateSearchHistory(response, cityName);
          this.router.navigate(['/home', cityName]);
        },
        error => {
          console.log("Error fetching weather by city", error);
          this.handleWeatherError(error);
        }
      );
  }

  private unsubscribeWeather() {
    if (this.weatherSubscription) {
      this.weatherSubscription.unsubscribe();
    }
  }

  onSubmit() {
    if (this.cityName.trim() === '') {
      return;
    }
    this.getWeatherByCity(this.cityName);
    this.cityName = '';
  }

  onCityNameChange() {
    this.searchSubject.next(this.cityName.trim());
  }

  changeLocation(location: string | any) {
    if (typeof location === 'string') {
      this.getWeatherByCity(location);
    } else if (typeof location === 'object' && location.city) {
      this.getWeatherByCity(location.city);
    }
  }

  setAllData(allWeather: WeatherData) {
    this.currentTemp = this.kelvinToCelsius(allWeather.main.temp);
    this.cityName = allWeather.name.split(',')[0].trim() || 'Unknown';
    this.description = allWeather.weather[0].description;
    this.country = allWeather.sys.country;
    this.setWeatherProperties(this.description, this.currentTemp);
    this.error = '';
  }

  setWeatherProperties(description: string, temperature: number) {
    const trimmedDescription = description.toLowerCase();
    let imageUrl = './assets/clear.png';
    let backgroundClass = 'default-background';
  
    if (temperature < 20) {
      imageUrl = './assets/cold.png';
      backgroundClass = 'cold-background';
    } else if (trimmedDescription.includes('rain') || trimmedDescription.includes('drizzle')) {
      imageUrl = './assets/rain.png';
      backgroundClass = 'rainy-background';
    } else if (trimmedDescription.includes('clear')) {
      imageUrl = './assets/clear.png';
      backgroundClass = 'clear-background';
    } else if (trimmedDescription.includes('cloud')) {
      imageUrl = './assets/cloud.png';
      backgroundClass = 'cloudy-background';
    } else if (trimmedDescription.includes('mist')) {
      imageUrl = './assets/mist.png';
      backgroundClass = 'mist-background';
    }
  
    this.weatherImageUrl = imageUrl;
    this.backgroundClass = backgroundClass;
  }
  

  kelvinToCelsius(temp: number): number {
    return Math.round(temp - 273.15);
  }

  handleWeatherError(error: any) {
    this.weatherData = undefined;
    this.error = 'Oop! Location Not Found!';
    this.weatherImageUrl = './assets/404.png';
    
  }

  updateSearchHistory(response: WeatherData, cityName: string) {
    const foundIndex = this.weatherHistory.findIndex(item => item.city.toLowerCase() === cityName.toLowerCase());

    const historyItem = {
      city: cityName,
      country: response.sys.country,
      temperature: this.kelvinToCelsius(response.main.temp),
      description: response.weather[0].description,
      humidity: response.main.humidity,
      windSpeed: response.wind.speed,
      backgroundClass: this.getBackgroundClass(response.weather[0].description, this.kelvinToCelsius(response.main.temp)),
      weatherImageUrl: this.getWeatherImageUrl(response.weather[0].description, this.kelvinToCelsius(response.main.temp))
    };

    if (foundIndex !== -1) {
      this.weatherHistory[foundIndex] = {
        ...this.weatherHistory[foundIndex],
        ...historyItem
      };
    } else {
      this.weatherHistory.unshift(historyItem);

      if (this.weatherHistory.length > 20) {
        this.weatherHistory.pop();
      }
    }

    this.saveWeatherHistory();
  }

  getBackgroundClass(description: string, temperature: number): string {
    const trimmedDescription = description.toLowerCase();

    if (temperature < 20) {
      return 'cold-background';
    } else if (trimmedDescription.includes('rain') || trimmedDescription.includes('drizzle')) {
      return 'rainy-background';
    } else if (trimmedDescription.includes('clear')) {
      return 'clear-background';
    } else if (trimmedDescription.includes('cloud')) {
      return 'cloudy-background';
    } else if (trimmedDescription.includes('mist')) {
      return 'mist-background';
    } else {
      return 'default-background';
    }
  }

  getWeatherImageUrl(description: string, temperature: number): string {
    const trimmedDescription = description.toLowerCase();

    if (temperature < 20) {
      return './assets/cold.png';
    } else if (trimmedDescription.includes('rain') || trimmedDescription.includes('drizzle')) {
      return './assets/rain.png';
    } else if (trimmedDescription.includes('clear')) {
      return './assets/clear.png';
    } else if (trimmedDescription.includes('cloud')) {
      return './assets/cloud.png';
    } else if (trimmedDescription.includes('mist')) {
      return './assets/mist.png';
    } else {
      return './assets/clear.png';
    }
  }

  saveWeatherHistory() {
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      sessionStorage.setItem('weatherHistory', JSON.stringify(this.weatherHistory));
    }
  }

  loadWeatherHistory() {
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      const history = sessionStorage.getItem('weatherHistory');
      if (history) {
        this.weatherHistory = JSON.parse(history);
      }
    }
  }

  clearWeatherHistory() {
    this.weatherHistory = [];
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      sessionStorage.removeItem('weatherHistory');
    }
  }

  navigateToSearch(cityName: string) {
    this.router.navigate(['/home', cityName]);
  }

  removeFromHistory(index: number) {
    if (index >= 0 && index < this.weatherHistory.length) {
      this.weatherHistory.splice(index, 1);
      this.saveWeatherHistory();
    }
  }

  onSelect(historyItem: any) {
    this.cityName = historyItem.city;
    this.getWeatherByCity(this.cityName);
  }

  onRemove(index: number) {
    this.removeFromHistory(index);
  }
}
