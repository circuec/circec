import pandas as pd
from datetime import datetime

# Wczytaj plik z Investing.com (zmień nazwę na swoją!)
df = pd.read_csv('Silver Futures Historical Data(2).csv')

# Funkcja naprawiająca daty (obsługuje różne formaty)
def fix_date(date_str):
    try:
        # Jeśli format to MM/DD/YYYY (tekst)
        if '/' in str(date_str):
            return datetime.strptime(str(date_str), '%m/%d/%Y').strftime('%Y-%m-%d')
        # Jeśli format to DD.MM.YYYY (tekst polski)
        elif '.' in str(date_str):
            return datetime.strptime(str(date_str), '%d.%m.%Y').strftime('%Y-%m-%d')
        # Jeśli już jest poprawna data
        else:
            return pd.to_datetime(date_str).strftime('%Y-%m-%d')
    except:
        return str(date_str)  # Na wszelki wypadek zostaw oryginał

# Napraw daty
df['created_at'] = df['Date'].apply(fix_date)

# Dodaj kolumny dla Supabase
df['symbol'] = 'ALI=F'
df['name'] = 'Srebro'
df['currency'] = 'USD'
df['source'] = 'investing_com'

# Zmień nazwę ceny
df['price'] = df['Price']  # lub 'Close' zależnie od nazwy w CSV

# Wybierz tylko potrzebne kolumny w odpowiedniej kolejności
output = df[['created_at', 'symbol', 'name', 'price', 'currency', 'source']]

# Zapisz jako CSV gotowy do importu
output.to_csv('srebro_import_clean.csv', index=False)

print(f"Przekonwertowano {len(output)} wierszy")
print("Plik srebro_import_clean.csv gotowy do importu do Supabase!")
print("\nPierwsze 5 wierszy:")
print(output.head())