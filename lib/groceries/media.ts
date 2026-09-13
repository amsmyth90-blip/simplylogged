// Videos stay on the device; only a bounded set of image frames is uploaded.
function wait(target: HTMLVideoElement, event: string) {
  return new Promise<void>((resolve,reject)=>{
    const timeout = setTimeout(()=>done(Error("Video could not be opened. Try photos instead.")),10_000);
    const good = ()=>done(); const bad = ()=>done(Error("Video could not be opened. Try photos instead."));
    function done(error?: Error) { clearTimeout(timeout); target.removeEventListener(event,good);
      target.removeEventListener("error",bad); if(error) reject(error); else resolve(); }
    target.addEventListener(event,good,{once:true}); target.addEventListener("error",bad,{once:true});
  });
}
async function jpeg(source: CanvasImageSource, width: number, height: number, name: string) {
  const scale = Math.min(1,1600/Math.max(width,height));
  const canvas = document.createElement("canvas"); canvas.width=Math.max(1,Math.round(width*scale)); canvas.height=Math.max(1,Math.round(height*scale));
  const context = canvas.getContext("2d"); if (!context) throw Error("Image processing is unavailable.");
  context.drawImage(source,0,0,canvas.width,canvas.height);
  const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b ? resolve(b) : reject(Error("Image could not be read.")),"image/jpeg",.78));
  return new File([blob],name,{type:"image/jpeg"});
}
export async function groceryFrames(files: File[]): Promise<File[]> {
  if (!files.length || files.length > 12) throw Error("Choose up to 12 photos or one short video.");
  if (files.some(file=>file.type.startsWith("video/")) && files.length !== 1) throw Error("Choose one video at a time.");
  const output: File[] = [];
  for (const file of files) {
    if (file.size > 80_000_000) throw Error("Choose a file smaller than 80 MB.");
    if (file.type.startsWith("video/")) {
      const video=document.createElement("video"); video.muted=true; video.playsInline=true; video.preload="auto";
      const url=URL.createObjectURL(file);
      try {
        const loaded=wait(video,"loadedmetadata"); video.src=url; video.load(); await loaded;
        if (video.duration === Infinity) { const end=wait(video,"seeked"); video.currentTime=1e10; await end; }
        if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 45) throw Error("Record up to 45 seconds. Pause on each name and date label.");
        const count=Math.min(12,Math.max(1,Math.ceil(video.duration/2)));
        for(let i=0;i<count;i++) {
          const time=Math.min(video.duration-.05,(i+.5)*video.duration/count);
          const seek=wait(video,"seeked"); video.currentTime=Math.max(.001,time); await seek;
          output.push(await jpeg(video,video.videoWidth,video.videoHeight,"frame-"+i+".jpg"));
        }
      } finally { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); }
    } else {
      if (!file.type.startsWith("image/")) throw Error("Choose photos or a video.");
      const image=await createImageBitmap(file);
      try { output.push(await jpeg(image,image.width,image.height,file.name+".jpg")); } finally { image.close(); }
    }
  }
  if (output.reduce((sum,file)=>sum+file.size,0)>3_500_000) throw Error("These images are too large. Scan fewer items at a time.");
  return output;
}
