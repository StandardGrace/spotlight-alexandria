---
# Basic contact info
name: "Joe's Pizza"
phone: "555-0142"
address: "12 Main St, Alexandria, ON"
website: "https://joespizza.example.com"
hours: "Mon-Sat 11am-9pm, Sun closed"

# Update this date whenever you reverify the info above is still correct.
# Older than 6 months triggers a "call ahead to confirm" notice on the site.
lastVerified: 2026-07-01

storefrontPhoto: "/images/restaurants/joes-pizza/storefront.jpg"

menu:
  - category: "Pizza"
    items:
      # Multi-option item: use "variants" instead of "price"
      - name: "Margherita"
        description: "Tomato, mozzarella, basil"
        variants:
          - label: "Small"
            price: 12.00
          - label: "Large"
            price: 18.00
  - category: "Salads"
    items:
      # Single fixed-price item: use "price", no "variants"
      - name: "Caesar salad"
        description: "Romaine, parmesan, croutons"
        price: 9.00
        photo: "/images/restaurants/joes-pizza/caesar-salad.jpg"
---
