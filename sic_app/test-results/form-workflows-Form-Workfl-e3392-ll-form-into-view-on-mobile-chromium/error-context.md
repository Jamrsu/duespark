# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - banner [ref=e6]:
        - generic [ref=e7]:
          - button "Open sidebar" [ref=e9] [cursor=pointer]:
            - img [ref=e10] [cursor=pointer]
          - generic [ref=e11]:
            - button "Switch to light theme" [ref=e12] [cursor=pointer]:
              - img [ref=e13] [cursor=pointer]
            - button "Logout" [ref=e15] [cursor=pointer]:
              - img [ref=e16] [cursor=pointer]
      - main [ref=e19]:
        - status "Loading" [ref=e22]:
          - img [ref=e23]
          - generic [ref=e25]: Loading...
    - generic [ref=e27]:
      - link "Dashboard" [ref=e28] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e29] [cursor=pointer]
        - generic [ref=e32] [cursor=pointer]: Dashboard
      - link "Invoices" [ref=e33] [cursor=pointer]:
        - /url: /invoices
        - img [ref=e34] [cursor=pointer]
        - generic [ref=e37] [cursor=pointer]: Invoices
      - link "Clients" [ref=e38] [cursor=pointer]:
        - /url: /clients
        - img [ref=e39] [cursor=pointer]
        - generic [ref=e44] [cursor=pointer]: Clients
      - link "Settings" [ref=e45] [cursor=pointer]:
        - /url: /settings
        - img [ref=e46] [cursor=pointer]
        - generic [ref=e49] [cursor=pointer]: Settings
  - status [ref=e50]
  - alert [ref=e51]
```