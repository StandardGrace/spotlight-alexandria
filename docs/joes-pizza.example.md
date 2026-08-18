---
# Basic contact info. Everything below that holds human-readable text is
# bilingual: an { en, fr } object. `en` is required; `fr` is optional and
# falls back to `en` when omitted - see docs/restaurant-data-model.md.
name:
  en: "Joe's Pizza"
  fr: "Pizza de Joe"
phone: "555-0142"
address: "12 Main St, Alexandria, ON"
website: "https://joespizza.example.com"
hours:
  en: "Mon-Sat 11am-9pm, Sun closed"
  fr: "Lun-Sam 11h-21h, Dim fermé"

# Update this date whenever you reverify the info above is still correct.
# Older than 6 months triggers a "call ahead to confirm" notice on the site.
lastVerified: 2026-07-01

storefrontPhoto: "/images/restaurants/joes-pizza/storefront.jpg"

# Optional. Free text about the restaurant - history, ambiance, whatever's
# worth saying. Omit this whole field if there's nothing to add.
about:
  en: "A neighbourhood spot serving wood-fired pizza since 1998."
  fr: "Un endroit de quartier servant de la pizza au four à bois depuis 1998."

menu:
  - category:
      en: "Pizza"
      fr: "Pizza"
    # Optional. Applies to every item in this category - gluten-free
    # options, "served with" notes, add-a-protein pricing, etc. Omit
    # entirely if the category doesn't need one (see "Salads" below).
    note:
      en: "Gluten-free crust available, +$3."
      fr: "Croûte sans gluten disponible, +3 $."
    items:
      # Multi-option item: use "variants" instead of "price"
      - name:
          en: "Margherita"
          fr: "Margherita"
        description:
          en: "Tomato, mozzarella, basil"
          fr: "Tomate, mozzarella, basilic"
        variants:
          - label:
              en: "Small"
              fr: "Petit"
            price: 12.00
          - label:
              en: "Large"
              fr: "Grand"
            price: 18.00
  - category:
      en: "Salads"
      fr: "Salades"
    items:
      # Single fixed-price item: use "price", no "variants"
      - name:
          en: "Caesar salad"
          fr: "Salade César"
        description:
          en: "Romaine, parmesan, croutons"
          fr: "Romaine, parmesan, croûtons"
        price: 9.00
        photo: "/images/restaurants/joes-pizza/caesar-salad.jpg"
---