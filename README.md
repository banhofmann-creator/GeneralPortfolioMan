# Depot (PWA)

Installierbare Web-App für das Depot-Dashboard. Die Depotdaten liegen nur verschlüsselt in `data.enc`
(PBKDF2-SHA256 + AES-GCM) und werden erst auf dem Gerät mit dem Passwort entschlüsselt.

- `index.html`, `app.js`: Dashboard und Entschlüsselung
- `sw.js`, `manifest.webmanifest`: Offline-Fähigkeit und App-Installation
- `data.enc`: wird werktags vom Morgenlauf neu geschrieben

Kaufen-Buttons kopieren die ISIN und öffnen die Consorsbank- bzw. ING-App. Keine Anlageberatung.
