param([Parameter(Mandatory=$true)][string]$InputPath, [Parameter(Mandatory=$true)][string]$OutputPath, [ValidateSet('light','dark')][string]$Background='light')

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class BookBackgroundExtractor {
  public static void Run(string input, string output, bool dark) {
    using (var source = new Bitmap(input))
    using (var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(bitmap)) graphics.DrawImageUnscaled(source, 0, 0);
      int width = bitmap.Width, height = bitmap.Height;
      var seen = new bool[width * height];
      var queue = new Queue<Point>();
      Action<int,int> add = (x,y) => { int i=y*width+x; if(!seen[i]) { seen[i]=true; queue.Enqueue(new Point(x,y)); } };
      for (int x=0; x<width; x++) { add(x,0); add(x,height-1); }
      for (int y=0; y<height; y++) { add(0,y); add(width-1,y); }
      while(queue.Count>0) {
        var point=queue.Dequeue(); var color=bitmap.GetPixel(point.X,point.Y);
        bool background = dark ? color.R < 80 && color.G < 80 && color.B < 80 : color.R > 170 && color.G > 170 && color.B > 170;
        if(!background) continue;
        bitmap.SetPixel(point.X,point.Y,Color.FromArgb(0,color.R,color.G,color.B));
        if(point.X>0) add(point.X-1,point.Y); if(point.X+1<width) add(point.X+1,point.Y);
        if(point.Y>0) add(point.X,point.Y-1); if(point.Y+1<height) add(point.X,point.Y+1);
      }
      bitmap.Save(output,ImageFormat.Png);
    }
  }
}
'@

[BookBackgroundExtractor]::Run($InputPath, $OutputPath, $Background -eq 'dark')
