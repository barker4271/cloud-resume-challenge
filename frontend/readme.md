# Frontend technical specification

- Create a static website that serves an HTML resume

##Resume format considerations

- Downloadable resumes need to be in PDF format
- Resumes should not include content such as a photo, gender, religion or other information that could be used for discrimination
- I will use the harvard resume template for this exercise

Used ChatGPT to generate a professional style resume using a modern, simple, clean design — no shadows, no cards, no heavy styling — just clean typography, light dividers, balanced spacing, and soft accents.  No CSS framework.

Used W3C Linter to clean up html

Installed local web server, which was new

reworked all of the pages to add a left hand menu, and load dynamic content from a json file.

Domain Information
    Name
        WOOKIETOAST.COM
        Registry Domain ID
        3043149651_DOMAIN_COM-VRSN
        Registered On
        2025-11-29T00:06:39Z
        Expires On
        2026-11-29T00:06:39Z
        Updated On
        2025-12-01T18:34:36Z
        Domain Status
        client transfer prohibited

Name Servers
    NS1-01.AZURE-DNS.COM
    NS2-01.AZURE-DNS.NET
    NS3-01.AZURE-DNS.ORG
    NS4-01.AZURE-DNS.INFO

Azure Front Door service setup manually via azure portal, not bicep, as that was too confusing a set of videos to follow

confirmation via whois of DNS server repoints to Azure

