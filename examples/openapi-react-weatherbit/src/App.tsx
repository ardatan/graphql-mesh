import * as React from 'react';
import './App.css';
import { useMeshSdk } from './useMeshSdk';
import { getDailyForecastByCoordinatesQuery } from '../.mesh';

function App() {
  const [forecastData, setForecastData] = React.useState<getDailyForecastByCoordinatesQuery['forecastData']>();

  const sdk = useMeshSdk();

  React.useEffect(() => {
    sdk
      ?.getDailyForecastByCoordinates({
        lat: 41.01384,
        lng: 28.94966,
        apiKey: '88dcfb1c31054b3b8841d753f3245da9',
      })
      .then(({ forecastData }) => {
        setForecastData(forecastData);
      });
  }, [sdk]);

  return (
    <div className="App">
      <header className="App-header">
        <p>Daily Forecast for {forecastData?.cityName}</p>
        <table>
          <thead>
            <tr>
              <th>DateTime</th>
              <th>Min Temp</th>
              <th>Max Temp</th>
            </tr>
          </thead>
          <tbody>
            {forecastData?.data?.map(dailyData => (
              <tr key={dailyData?.datetime}>
                <td>{dailyData?.datetime}</td>
                <td>{dailyData?.minTemp}</td>
                <td>{dailyData?.maxTemp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul></ul>
      </header>
    </div>
  );
}

export default App;
