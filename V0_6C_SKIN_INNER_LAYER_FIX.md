# 0.6c Skin Inner Layer Fix

- PNG skina jest ustawiany bezpośrednio na `#clicker`.
- Użyto `style.setProperty(..., "important")`, aby klasy skina nie nadpisywały obrazu.
- Tekstura jest nakładana kilka razy po renderze, również po wyposażeniu skina.
- Stary gradient pozostaje jedynie jako delikatne oświetlenie.
- Paczka nie zawiera tekstur.
