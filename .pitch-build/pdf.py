from pathlib import Path
from reportlab.pdfgen import canvas
from pypdf import PdfReader

root=Path('/Users/patrick/Documents/ChatGPT/Spellcast')
out=root/'output/pitch/Spellcast-Pitch.pdf'
c=canvas.Canvas(str(out), pagesize=(960,540))
c.setTitle('Spellcast - Build Day Pitch')
c.setAuthor('Spellcast')
c.setSubject('Research-backed pitch, market assumptions and prototype demonstration')
links=[
 'https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/media-nations/2025/media-nations-2025-uk-report.pdf',
 'https://www.ofcom.org.uk/tv-radio-and-on-demand/digital-radio/top-trends-uk-listening-habits-2025',
 'https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/families/bulletins/familiesandhouseholds/2025',
 'https://www.mynewsdesk.com/flic/pressreleases/flic-duo-pre-orders-are-open-now-exclusive-offers-and-limited-bundles-available-today-3365357',
]
for i in range(1,14):
 c.drawImage(str(root/f'.pitch-build/previews/slide-{i:02}.png'),0,0,width=960,height=540)
 if i==13:
  for j,url in enumerate(links):
   y=228+j*78
   c.linkURL(url,(120,540-(y+40)*.75,900,540-y*.75),relative=0,thickness=0)
 c.showPage()
c.save()
assert len(PdfReader(str(out)).pages)==13
print(out)
