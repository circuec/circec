export async function GET() {
  const response = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
  const data = await response.json();
  
  const usdToPln = data.rates[0].mid; // np. 4.0234
  
  return Response.json({
    usdToPln,
    eurToPln: null, // możesz dodać osobne zapytanie dla EUR
    date: data.rates[0].effectiveDate
  });
}