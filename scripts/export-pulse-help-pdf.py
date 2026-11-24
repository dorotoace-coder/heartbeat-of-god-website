import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from pypdf import PdfReader
parser=argparse.ArgumentParser(description='Export the verified Pulse OS guide data as printable PDFs.')
parser.add_argument('--data', required=True, type=Path)
parser.add_argument('--output', default=Path('public/help'), type=Path)
parser.add_argument('--poster', default=Path('public/help/pulse-os-overview.png'), type=Path)
args=parser.parse_args()
out=args.output
out.mkdir(parents=True, exist_ok=True)
data=json.loads(args.data.read_text())
poster=args.poster
w,h=A4
c=canvas.Canvas(str(out/'pulse-os-overview.pdf'),pagesize=A4)
c.setTitle('HBG Pulse OS — Overview')
iw,ih=ImageReader(str(poster)).getSize();width=w-40;height=width*ih/iw
c.drawImage(str(poster),(w-width)/2,(h-height)/2,width=width,height=height,preserveAspectRatio=True)
c.save()
styles={
 'eyebrow':ParagraphStyle('eyebrow',fontName='Helvetica-Bold',fontSize=9,leading=13,textColor=HexColor('#7B2FF7'),spaceAfter=12),
 'title':ParagraphStyle('title',fontName='Times-Roman',fontSize=29,leading=34,textColor=HexColor('#2E1252'),spaceAfter=12),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10.5,leading=15.5,textColor=HexColor('#303044'),spaceAfter=11),
 'small':ParagraphStyle('small',fontName='Helvetica',fontSize=9,leading=13,textColor=HexColor('#606070'),spaceAfter=9),
 'sub':ParagraphStyle('sub',fontName='Helvetica-Bold',fontSize=11,leading=16,textColor=HexColor('#2E1252'),spaceAfter=6),
}
def p(text,style='body'):return Paragraph(escape(text),styles[style])
def numbered(items):
 result=[]
 for n,item in enumerate(items,1):result.append(Paragraph(f'<b>{n:02d}</b>  '+escape(item),styles['body']))
 return result
story=[p('HBG PULSE OS · TEAM HELP','eyebrow'),p('Serve with confidence.','title'),p('Your practical companion for using the whole workspace. Read the task, follow the steps and check the saved result.'),p('Guide edition '+data['edition'],'small'),Spacer(1,18),p('Start here','sub'),*numbered(data['start']),Spacer(1,14),p('Learning is shared. Access stays assigned.','sub'),p('Every signed-in team member can read the app guides. Reading a guide does not grant permission to view another department’s records. Ask your leader when an assignment is missing.'),p('App help and ministry training serve different purposes. Use this guide for navigation; use the Training library for assigned teaching and learning progress.'),p('Role guides inside: '+ ' · '.join(g['title'] for g in data['guides']),'small')]
for g in data['guides']:
 story.extend([PageBreak(),p(g['audience'].upper(),'eyebrow'),p(g['title'],'title'),p(g['summary']),p('START: '+g['where'],'sub'),Spacer(1,5),*numbered(g['steps']),Spacer(1,5),KeepTogether([p('How you know it worked','sub'),p(g['confirmation'])]),KeepTogether([p('If something goes wrong','sub'),p(g['recovery'])])])
def footer(c,doc):
 c.setStrokeColor(HexColor('#DDD2E9'));c.line(42,42,w-42,42)
 c.setFont('Helvetica',8);c.setFillColor(HexColor('#606070'))
 c.drawString(42,28,'HBG Pulse OS · Product help · '+data['edition'])
 c.drawRightString(w-42,28,str(doc.page))
doc=SimpleDocTemplate(str(out/'pulse-os-team-guide.pdf'),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=42,bottomMargin=58,title='HBG Pulse OS — Team Guide')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
for name in ['pulse-os-overview.pdf','pulse-os-team-guide.pdf']:
 reader=PdfReader(out/name)
 print(name,'pages:',len(reader.pages))
 if 'team-guide' in name:
  assert len(reader.pages)==len(data['guides'])+1,'Guide spilled beyond the one-page-per-workspace layout'
  texts='\n'.join(page.extract_text() or '' for page in reader.pages)
  for g in data['guides']:assert g['title'] in texts,g['title']
