

// Dataset ECMWF/ERA5/DAILY per temperatura e precipitazioni
var datasetTemp = ee.ImageCollection("ECMWF/ERA5/DAILY").select('mean_2m_air_temperature');
var datasetPrecip = ee.ImageCollection("ECMWF/ERA5/DAILY").select('total_precipitation');

// Funzione per calcolare NDSI per un dato anno
function calculateNDSI(year) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);
  var dataset;
  var ndsiBandNames;

  if (year <= 2011 && year != 2008) {
    dataset = ee.ImageCollection('LANDSAT/LT05/C01/T1');
    ndsiBandNames = ['B2', 'B5']; // Landsat 5 band names for NDSI
  } else if (year >= 2013) {
    dataset = ee.ImageCollection('LANDSAT/LC08/C01/T1');
    ndsiBandNames = ['B3', 'B6']; // Landsat 8 band names for NDSI
  } else {
    dataset = ee.ImageCollection('LANDSAT/LE07/C01/T1');
    ndsiBandNames = ['B2', 'B5']; // Landsat 7 band names for NDSI
  }

  var ndsi = dataset
    .filterDate(startDate, endDate)
    .filterBounds(aoi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .select(ndsiBandNames)
    .median()
    .normalizedDifference(ndsiBandNames).rename('NDSI');

  return ndsi.clip(aoi);
}


// Funzione per calcolare la temperatura media e le precipitazioni totali annuali
function getClimateData(year) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);

  // Temperatura
  var tempYear = datasetTemp.filterDate(startDate, endDate).mean();
  var meanTemp = ee.Number(tempYear.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: aoi,
    scale: 10000
  }).get('mean_2m_air_temperature')).subtract(273.15); // Converti in Celsius

  // Precipitazioni
  var precipYear = datasetPrecip.filterDate(startDate, endDate).sum();
  var totalPrecip = ee.Number(precipYear.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 10000
  }).get('total_precipitation')).multiply(1000); // Converti in mm

  return {temperature: meanTemp, precipitation: totalPrecip};
}



// Lista per raccogliere le feature per ogni anno
var yearlyData = ee.List([]);

// Loop attraverso gli anni
for (var year = 1985; year <= 2020; year++) {
  var ndsi = calculateNDSI(year); // Calcola NDSI
  var climateData = getClimateData(year); // Ottieni dati climatici
 
  // Crea un ee.Feature per l'anno corrente con i dati climatici
  var feature = ee.Feature(null, {
    'year': year,
    'mean_temperature_celsius': climateData.temperature,
    'total_precipitation_mm': climateData.precipitation
  });

  // Aggiungi la feature alla lista
  yearlyData = yearlyData.add(feature);
  
  // Esporta NDSI come immagine
  Export.image.toDrive({
    image: ndsi,
    description: 'NDSI_' + year,
    scale: 30,
    region: aoi,
    fileFormat: 'GeoTIFF',
    folder: 'NDSI_Images'
  });
  
}

// Crea un FeatureCollection dalla lista delle feature
var yearlyDataCollection = ee.FeatureCollection(yearlyData);

// Esporta il FeatureCollection come CSV per i dati climatici
Export.table.toDrive({
  collection: yearlyDataCollection,
  description: 'Climate_Data_1985_to_2020',
  fileFormat: 'CSV',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Climate_Data_1985_2020'
});
