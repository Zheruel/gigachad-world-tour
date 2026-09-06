#!/usr/bin/env python3
"""Build the selected Duke library; never modify existing voice assets or source archive.
Usage: python3 tools/production/build_duke_library.py [archive.7z] [--source-dir extracted]
Requires bsdtar, ffmpeg and ffprobe. Catalog transcripts are filename-derived, not ear-verified.
"""
import argparse, concurrent.futures, hashlib, json, re, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'audio/voice/duke'
SELECTION = {
'combat': """Bring It On
Bring the Pain
Come Get Some 1
Eat Foot and Die!
Eat Lead!
Eat My Size 14
Eat That!
Embrace the Beatdown
In the Face!
It's Clobberin' Time 1
Let's Dance!
My Foot, Your Face
Time to Bring the Pain
Who's Next
You Wanna Dance 1
Suck It Down 1
Rock and Roll
It's Ass Kickin' Time!
That'll Bring on a Visit to the Dentist
I Have a PhD in Kickin' Ass
Who Wants Some 1
This is Some Serious Ass Kickin'!
It's Game Time!
Let's Get It On!
Eat Shit and Die 1""",
 'threats': """Don't Mess with Me
I'm Not Gonna Fight You... I'm Gonna Kick Your Ass
It's Payback Time
Mess with the Best, Die Like the Rest 1
Quit Wastin' My Time
See You in Hell 1
Time for Your Last Stand
You Been Writin' Checks Your Ass Can't Cash
You're Pissin' Me Off
I'll Blow You a New Hole
I Own Your Ass
Next Time, Stay Dead
I Don't Die That Easy, Boy
Killing You is as Easy as Breathing
It's About Time You Died
It's Time to Get Some
It's My Way or... Hell, It's My Way
Let's Settle This Once and for All!
When You Get to Hell... Tell 'em Duke Sent Ya
Good, Bad... I'm the Guy with the Gun
It's a Good Day to Die""",
'explosions': """Time to Blow This Joint
Time to Blow Shit Up
Rest in Pieces 1
Lights Out!
Heheheh... What a Mess
This Thing's a Train Wreck Waitin' to Happen
Asses to Ashes
Time to Turn Up the Heat
Time to Fumigate
Looks Like Clean Up on Aisle Four
No Disassembly Required
Good Riddance
Time to Redecorate, in Brain Matter Grey
Looks Like You're Comin' Apart at the Seams
Time for the Shit to Hit the Fan
That'll Slow Down Their Operation
That's One Crispy Critter!
This Tape Will Self-Destruct in One Second
What's in Those Barrels Can't Be Good
Time to Clean Out the Garage""",
'entrances': """ALL ABOARD!
I'm Back!
I Was Born Ready
Ready for Action 1
Let's Rock 1
Let's Get This Show on the Road
Let's Do This!
Let the Games Begin!
It's Go Time!
Time to Crash This Party
Time to Get Moving
It's Time to Kick Ass and Chew Bubblegum... and I'm All Outta Gum 1
I'm Ready for Some Action... Now!
Time to Fly
Time to Jet
No Time to Waste
Time to Storm the Gates!
It's Time to Make Tracks
Let's Wrap Things Up
This is Where the Rubber Hits the Road""",
'reactions': """This Train is Goin' Nowhere Fast
Ooh! That's Gotta Hurt
Damn 1
Damn, That Was Annoying 1
Groovy! 1
Shit Happens 1
What the Hell was That
Uh Oh, This is Not Good!
Something Tells Me This Won't Pass Any Safety Inspections
Looks Like I'm Gettin' Off Here
This is Taking Forever!
Ahh, That's Better
I Ain't Got Time to Bleed
Damn, What a Waste
What a Surprise
What are Ya Waitin' For - Christmas 1
This Place Gives Me the Creeps!
This Looks Interesting
What We've Got Here... is a Failure to Communicate
That was a Close Shave""",
'victory': """Hail to the King, Baby 1
Damn, I'm Good 1
I Came, I Saw, I Kicked Ass
Sometimes I Even Amaze Myself
This is Why I Have Games Named After Me
Yeah, Piece of Cake 1
Too Easy!
Game Over 1
It's Good to be the King!
Ooh, I Make This Look Good!
Damn, I'm Lookin' Good
Terminated 1
Looks Like the Best Man Won
This Game's as Good as Won
Looks Like This One's History
I am the King of the World, Baby
That's How We Do It!
Who's That Handsome Devil
Killing is my Business... and Business is Good""",
}
USES = {
'combat': 'Attack, combo or elite encounter punctuation; avoid repeating on ordinary hits.',
'threats': 'Boss challenge or pre-fight response.',
'explosions': 'Detonation, environmental destruction or wreck aftermath.',
'entrances': 'Level entrance, encounter reveal or departure.',
'reactions': 'Short contextual response to scenery, damage or a surprise.',
'victory': 'Encounter victory, finishing pose or stage completion.',
}
def run(args):
    return subprocess.check_output(args, text=True)
def build_one(job):
    category, title, src = job
    transcript = re.sub(r' [1-5]$', '', title)
    slug = re.sub(r'[^a-z0-9]+', '_', transcript.lower()).strip('_')
    relative = f'{category}/{slug}.mp3'
    target = OUT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    # Only remove silence at the boundaries; preserve pauses inside the delivery.
    filters = 'silenceremove=start_periods=1:start_duration=0.015:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-55dB,areverse,loudnorm=I=-18:TP=-2:LRA=7,apad=pad_dur=0.04'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-map_metadata','-1','-vn','-af',filters,'-ar','44100','-ac','1','-codec:a','libmp3lame','-b:a','96k',str(target)],check=True)
    duration = float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(target)]))
    return dict(id='duke_'+slug, file=relative, transcript=transcript, category=category,
        duration=round(duration,3), sourceFilename=src.name,
        sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),
        sha256=hashlib.sha256(target.read_bytes()).hexdigest(), suggestedUse=USES[category],
        transcriptProvenance='source-filename', listeningVerified=False)
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive',nargs='?',default=str(Path.home()/'Downloads/Duke Nukem - Vocal Collection.7z'))
    parser.add_argument('--source-dir',type=Path)
    args=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='duke-curation-') as tmp:
        source=args.source_dir or Path(tmp)
        if not args.source_dir:
            subprocess.run(['bsdtar','-xf',args.archive,'-C',str(source)],check=True)
        jobs=[(cat,title,source/(title+'.mp3')) for cat,lines in SELECTION.items() for title in lines.splitlines()]
        assert len(jobs)==125
        for _,_,path in jobs:
            if not path.is_file(): raise FileNotFoundError(path)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            clips=list(pool.map(build_one,jobs))
        assert len({c['sha256'] for c in clips})==125
        # Legacy performances carry their original bytes and stable slot aliases.
        # Preserve them on every rebuild; only archive-derived entries are regenerated.
        previous=json.loads((OUT/'catalog.json').read_text()) if (OUT/'catalog.json').is_file() else {}
        legacy=[c for c in previous.get('clips',[]) if c.get('legacySlots')]
        new_ids={c['id'] for c in clips}
        for c in legacy:
            if c['id'] in new_ids:
                raise ValueError(f'Legacy/archive ID collision: {c["id"]}')
        clips.extend(legacy)
        archive=Path(args.archive)
        catalog=dict(version=1, sourceArchive=archive.name,
            sourceArchiveSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
            processing='Boundary silence trimmed at -55 dB; mono 44.1 kHz MP3 96 kbps; -18 LUFS target, -2 dBTP ceiling. Internal pauses retained.',
            selectionBasis='Distinct reusable filename-labelled lines; duration and decode checks. Delivery quality and exact transcript require listening review.',
            existingVoiceAssets='Preserved legacy takes are catalogued with legacySlots; stable game slot IDs retain their original recordings.',clips=clips)
        (OUT/'catalog.json').write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n')
        print(f'Built 125 curated archive clips plus {len(legacy)} preserved legacy takes: {len(clips)} total clips ({sum(c["duration"] for c in clips):.1f}s). Listening verification remains pending.')
if __name__=='__main__': main()
