# Forno Nero — pizza restaurant website

A static, dark and colourful one-page site. No build step: open `index.html` in a browser.

## Files

| Path | What it holds |
| --- | --- |
| `index.html` | Page markup, SVG icons, restaurant JSON-LD |
| `css/style.css` | All styles; colour and font tokens are in `:root` at the top |
| `js/main.js` | Menu data, cart, pizza builder, deal countdown, reviews slider, gallery lightbox, booking form |
| `images/` | Photos as WebP (`menu/`, `gallery/`, plus hero, story, deal and interior shots) |

## Customising

- **Name and contact details**: search `index.html` for `Forno Nero`, `128 Ember Street`, `(555) 214-7788` and `ciao@fornonero.com` (they also appear in the JSON-LD block in `<head>`).
- **Menu and prices**: the `MENU` array in `js/main.js`. Each item's `img` is a file name in `images/menu/`.
- **Opening hours**: `HOURS` in `js/main.js`. It drives the open/closed badges, the hours list and the "we're closed that day" check in the booking form.
- **Pizza builder**: `SIZES`, `CRUSTS`, `SAUCES` and `TOPPINGS` at the top of the builder section in `js/main.js`.
- **Map**: the OpenStreetMap `iframe` URL in the Visit section (`bbox` and `marker` coordinates).

## Before going live

Checkout, table booking and the newsletter signup are front-end demos that only show a confirmation message. Connect them to your ordering, booking and email services. The cart is saved in the visitor's browser (`localStorage`).

## Photo credits

All photos are from [Unsplash](https://unsplash.com) and free to use under the Unsplash License. Each source is at `https://images.unsplash.com/photo-<id>`.

| File | Unsplash id |
| --- | --- |
| hero-pizza (background removed) | 1595854341625-f33ee10dbf94 |
| about-oven | 1579751626657-72bc17010498 |
| about-chef | 1572552635104-daf938e0aa1f |
| deal-slice | 1541745537411-b8046dc6d66c |
| interior | 1517248135467-4c7edcad34c4 |
| gallery/sharing | 1605478371310-a9f1e96b4ff4 |
| gallery/peel | 1590083745251-4fdb0b285c6a |
| gallery/chef | 1577219491135-ce391730fb2c |
| gallery/slice | 1600028068383-ea11a7a101f3 |
| gallery/cheese-pull | 1593504049359-74330189a345 |
| gallery/prosciutto | 1600628421055-4d30de868b8f |
| gallery/neapolitan | 1564936281291-294551497d81 |
| gallery/dark-margherita | 1571997478779-2adcbbe9ab2f |
| menu/margherita | 1574071318508-1cdbab80d002 |
| menu/pepperoni | 1534308983496-4fabb1a015ee |
| menu/diavola | 1585238342024-78d387f4a707 |
| menu/funghi | 1590947132387-155cc02f3212 |
| menu/burrata-verde | 1593560708920-61dd98c46a4e |
| menu/bbq-chicken | 1565299624946-b28f40a0ae38 |
| menu/garden-veggie | 1617470702892-e01504297e84 |
| menu/quattro-formaggi | 1513104890138-7c749659a591 |
| menu/carbonara | 1612874742237-6526221588e3 |
| menu/arrabbiata | 1621996346565-e3dbc646d9a9 |
| menu/pesto | 1473093295043-cdd812d0e601 |
| menu/gamberi | 1563379926898-05f4575a45d8 |
| menu/truffle-fries | 1573080496219-bb080dd4f877 |
| menu/wings | 1567620832903-9fc6debc209f |
| menu/caesar | 1550304943-4f24f54ddde9 |
| menu/panzanella | 1592417817098-8fd3d9eb14a5 |
| menu/tiramisu | 1571877227200-a0d98ea607e9 |
| menu/brownie | 1624353365286-3f8d62daad51 |
| menu/panna-cotta | 1488477181946-6428a0291777 |
| menu/gelato | 1551024506-0bccd828d307 |
| menu/lemonade | 1513558161293-cdaf765ed2fd |
| menu/iced-tea | 1556679343-c7306c1976bc |
| menu/cocktails | 1544145945-f90425340c7e |
| menu/freakshake | 1563805042-7684c019e1cb |
