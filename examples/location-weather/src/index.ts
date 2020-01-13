const query = /* GraphQL */ `
  query {
    forecastDay(
      city: "Tel Aviv"
      country: "IL"
      key: "971a693de7ff47a89127664547988be5"
    ) {
      cityName
      countryCode
      stateCode
      timezone
      data {
        appMaxTemp
        appMinTemp
        clouds
        datetime
        maxDhi
      }
    }
  }
`;
