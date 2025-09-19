---
subject: >-
  {{ 'Quick nudge about invoice ' if tone == 'friendly' else ('Action required: invoice ' if tone == 'firm' else 'Reminder: invoice ') }}{{ invoice_number }}
tone: friendly
---

Hi {{ client_name }},

{% if tone == 'friendly' %}
Hope you're well! This is a friendly reminder about invoice {{ invoice_number }} for **{{ amount_formatted }}** due {{ due_date_iso }}.
If you've already paid, thank you! Otherwise, you can use this link: {{ pay_link }}

Best,
{{ from_name }}
{% elif tone == 'firm' %}
Invoice {{ invoice_number }} for **{{ amount_formatted }}** is overdue as of {{ due_date_iso }}. Please arrange payment: {{ pay_link }}.

Regards,
{{ from_name }}
{% else %}
This is a reminder for invoice {{ invoice_number }} totaling **{{ amount_formatted }}** due on {{ due_date_iso }}.
Pay: {{ pay_link }}

Regards,
{{ from_name }}
{% endif %}

