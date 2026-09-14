# Kvíz Parti – Kahoot klón / Kahoot-style live quiz

Élő kvíz webalkalmazás **PeerJS** alapon: a **házigazda böngészője a játék szervere**.  
Live quiz web app powered by **PeerJS**: the **host browser is the realtime authority**.

🌐 **Play:** https://zsoltpete.github.io/kahoot-clone/

> ⚠️ **Fontos / Important:** A házigazda lapját tartsd nyitva a játék alatt. Ha bezárod, a játékosok kapcsolata megszakad.  
> Keep the host tab open during the game. Closing it disconnects all players.

## Hogyan játssz / How to play

### Házigazda (Host)
1. Nyisd meg az oldalt → **Házigazda**
2. Válassz vagy szerkessz egy kvízt (cím, kérdések, 2–4 válasz, helyes válasz, időlimit)
3. **Indítás** → megjelenik a **6 jegyű PIN**
4. A játékosok a **Csatlakozás** oldalon írják be a PIN-t és a becenevüket
5. Lobby: játékosok listája, csatlakozás lezárása, kirúgás
6. **Játék indítása** → kérdés → lezárás → felfedés → ranglista → következő → dobogó
7. **Újra játszás** a lobbyba visz vissza

### Játékos (Player, mobilbarát)
1. **Csatlakozás** → PIN + becenév
2. Lobby, majd a kérdések és a nagy színes válaszgombok (piros / kék / sárga / zöld) a saját eszközön
3. Felfedés után helyes/helytelen, pont és helyezés

## Pontszám / Scoring
- Helyes válasz: alap + sebességbónusz (minél gyorsabb, annál több; kb. 1000→500)
- Rossz válasz / időtúllépés: **0**

## Technológia / Tech
- Vite + React + TypeScript
- PeerJS (nyilvános broker) – P2P adatkapcsolat a házigazdához
- GitHub Pages (statikus hosting) + GitHub Actions deploy
- `base: '/kahoot-clone/'`
- HashRouter (`#/join`, `#/host`) – megbízható Pages SPA útvonalak

## Korlátok / Limits
- Nincs központi szerver: a házigazda gépének online kell maradnia
- PeerJS/WebRTC: egyes hálózatok (szigorú tűzfal, egyes vállalati Wi‑Fi) blokkolhatják
- Játékosok száma: praktikus limit ~20–30 (böngésző + Peer kapcsolatok)
- Kvízek a házigazda `localStorage`-ában tárolódnak
- Egy PIN = egy élő házigazda session

## Fejlesztés / Development

```bash
npm install
npm run dev
npm run build
```

## Licenc
Oktatási / hobbi projekt. A „Kahoot” védjegy a Kahoot! ASA tulajdona — ez egy független klón.
