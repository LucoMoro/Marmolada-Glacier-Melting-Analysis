var startDate1 = '1985-01-01';
var endDate1 = '1985-12-31';
var startDate2 = '2020-01-01';
var endDate2 = '2020-12-31';

function getAnnualTemp(year, aoi) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = startDate.advance(1, 'year');
  return datasetTemp.filterDate(startDate, endDate)
    .filterBounds(aoi)
    .mean()
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: aoi,
      scale: 10000,
      maxPixels: 1e9
    }).get('mean_2m_air_temperature');
}

function getAnnualPrecip(year, aoi) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = startDate.advance(1, 'year');
  return datasetPrecip.filterDate(startDate, endDate)
    .filterBounds(aoi)
    .sum()
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi,
      scale: 10000,
      maxPixels: 1e9
    }).get('total_precipitation');
}




var landsat5 = ee.ImageCollection('LANDSAT/LT05/C01/T1')
    .filterDate(startDate1, endDate1)
    .filterBounds(aoi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .median(); // Mediana per ridurre l'impatto delle nuvole.

var landsat8 = ee.ImageCollection('LANDSAT/LC08/C01/T1')
    .filterDate(startDate2, endDate2)
    .filterBounds(aoi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .median();
    
    
var datasetTemp = ee.ImageCollection("ECMWF/ERA5/DAILY")
  .select('mean_2m_air_temperature');

var datasetPrecip = ee.ImageCollection("ECMWF/ERA5/DAILY")
  .select('total_precipitation');




var ndsi1985 = landsat5.normalizedDifference(['B2', 'B5']).rename('NDSI');
var ndsi2020 = landsat8.normalizedDifference(['B3', 'B6']).rename('NDSI');

// Maschera i dati fuori dall'AOI
var maskedNDSI1985 = ndsi1985.updateMask(ndsi1985.gt(0).and(ndsi1985.clip(aoi)));
var maskedNDSI2020 = ndsi2020.updateMask(ndsi2020.gt(0).and(ndsi2020.clip(aoi)));

// Calcola la differenza di NDSI dopo aver mascherato e tagliato i dati
var maskedDifference = maskedNDSI2020.subtract(maskedNDSI1985);

// Aggiunge i layer mascherati al Map canvas.
Map.addLayer(maskedNDSI1985, {min: 0, max: 1, palette: ['white', 'blue']}, 'NDSI 1985');
Map.addLayer(maskedNDSI2020, {min: 0, max: 1, palette: ['white', 'blue']}, 'NDSI 2020');

// Visualizza la differenza di NDSI mascherata come una mappa di calore.
Map.addLayer(maskedDifference, {min: -0.5, max: 0.5, palette: ['ff0000', '0000ff']}, 'Differenza di NDSI');






// Ottieni i dati per gli anni 1985 e 2020
var temp1985 = getAnnualTemp(1985, aoi);
var temp2020 = getAnnualTemp(2020, aoi);
var precip1985 = getAnnualPrecip(1985, aoi);
var precip2020 = getAnnualPrecip(2020, aoi);

// Stampa i risultati in console
temp1985.evaluate(function(value) { print('Temperatura media 1985 (°C):', value); });
temp2020.evaluate(function(value){ print('Temperatura media 2020 (°C):', value); });
precip1985.evaluate(function(value) { print('Precipitazioni totali 1985 (mm):', value); });
precip2020.evaluate(function(value) { print('Precipitazioni totali 2020 (mm):', value); });
