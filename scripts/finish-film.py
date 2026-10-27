"""Compose titles and an original ambient score, then encode the campus film."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
import wave,subprocess,imageio_ffmpeg

root=Path(__file__).resolve().parent.parent/'outputs'
source=root/'campus-frames'
output=root/'campus-film-frames';output.mkdir(exist_ok=True)
sans=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
titlefont=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf',25)
brandfont=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
labels=['THE ARRIVAL','THE RESEARCH LAB','THE BUILD STUDIO','THE PROJECT GALLERY','THE MEETING GARDEN']
titles=['A place for possibility.','Every breakthrough starts with a question.','Imagination, made real.','Made with purpose. Ready for the world.','Let’s build what’s next.']
frames=sorted(source.glob('frame-*.png'))
assert len(frames)==361,f'Expected 361 rendered frames; got {len(frames)}'
for i,path in enumerate(frames):
    cached=output/path.name
    if cached.is_file():
        try:
            with Image.open(cached) as check:check.verify()
            continue
        except (OSError,SyntaxError):pass
    image=Image.open(path).convert('RGB');d=ImageDraw.Draw(image)
    d.rectangle((0,0,960,34),fill='#10291e');d.rectangle((0,507,960,540),fill='#10291e')
    d.text((27,9),'sprout tech',font=brandfont,fill='#e9edcf')
    d.text((628,11),'AN ORIGINAL FIRST-PERSON CAMPUS FILM',font=sans,fill='#bbcfa7')
    chapter=min(4,int(i/360*5))
    # A soft lower gradient keeps titles readable as the visitor enters each room.
    overlay=Image.new('RGBA',image.size);o=ImageDraw.Draw(overlay)
    for y in range(415,508):o.line((0,y,960,y),fill=(10,30,21,int((y-415)/93*140)))
    image=Image.alpha_composite(image.convert('RGBA'),overlay);d=ImageDraw.Draw(image)
    d.text((28,443),f'0{chapter} / {labels[chapter]}',font=sans,fill='#dae6be')
    d.text((28,467),titles[chapter],font=titlefont,fill='#f1f1dc')
    d.rectangle((0,537,round(960*i/360),540),fill='#dbe7b6')
    image.convert('RGB').save(output/path.name)

# Original, quiet sound design: filtered forest air, distant bird phrases, steps.
rate=24000;seconds=len(frames)/8;t=np.arange(round(rate*seconds))/rate
rng=np.random.default_rng(742)
noise=rng.normal(0,1,len(t));kernel=np.ones(95)/95
air=np.convolve(noise,kernel,mode='same')*.12
sound=air*(.65+.25*np.sin(t*.55))
for start in [1.8,5.2,9.3,14.6,19.2,24.0,27.2,33.1,38.5,42.1]:
    rel=t-start;mask=(rel>0)&(rel<.65)
    chirp=np.sin(2*np.pi*(1700*rel+550*rel**2))*np.sin(np.pi*np.clip(rel/.65,0,1))**3
    sound+=np.where(mask,chirp*.025,0)
for start in np.arange(.7,seconds-.8,.72):
    rel=t-start;mask=(rel>0)&(rel<.14)
    sound+=np.where(mask,rng.normal(0,1,len(t))*.06*np.exp(-np.clip(rel,0,100)*40),0)
fade=np.minimum(np.minimum(t/1.5,(seconds-t)/2),1).clip(0,1);sound*=fade
stereo=np.stack([sound,np.roll(sound,100)*.93],axis=-1)
audio=root/'campus-original-score.wav'
with wave.open(str(audio),'wb') as wav:
    wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes((stereo.clip(-1,1)*32767).astype('<i2').tobytes())
destination=root.parent/'dist/assets/sprout-campus.mp4'
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-framerate','8','-i',str(output/'frame-%04d.png'),'-i',str(audio),'-vf','minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart','-y',str(destination)],check=True)
Image.open(frames[0]).convert('RGB').save(root.parent/'dist/assets/campus-poster.jpg',quality=90)
print(f'Original campus film encoded: {destination}, {destination.stat().st_size/1048576:.1f} MB')
