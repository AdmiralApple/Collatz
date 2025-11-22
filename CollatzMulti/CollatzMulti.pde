import com.hamoid.*;
String VIDEO_FILENAME = "collatz_multiverse_BLEH.mp4";
String AUDIO_FILENAME = "bleh.txt";
boolean SAVE_VIDEO = true;
VideoExport videoExport;
import processing.sound.*;

// determine which universes are rendered, and how many. If you just want to see one, set WORLD_T_W and WORLD_T_H to 1.
int WORLD_T_XSTART = 0;
int WORLD_T_YSTART = 0;
int WORLD_T_W = 3;
int WORLD_T_H = 3;

SoundFile[] sfx;
String[] sfx_names = {"drop", "whoosh"};
float SPEED_UP_RATE = 0.6;  // 0.5 is normal. The lower the number, the faster the speed up of a chain.

int CREATE_EVERY = 180;
float CHAIN_TIME = 90;
float RAD = 20;

World[][] worlds = new World[WORLD_T_W][WORLD_T_H];


float SCREEN_W = 1920;
float SCREEN_H = 1080;
float M = 7;
float WORLD_W = SCREEN_W/WORLD_T_W-M*2;
float WORLD_H = SCREEN_H/WORLD_T_H-M*2;


color BALL_COLOR;
color TEXT_COLOR;
color LINE_COLOR;
float ARROW_R = 8;
float TARGET_DIST = 57;
float FUZZ_DIST = 105;
float SIDE_FORCE = 0.01;
float ARROW_FORCE = 0.01;
float FRICTION = 0.88;

int BLINK_COUNT = 15;
int BLINK_SPEED = 5;
Num dragging = null;

PrintWriter output;

void createWorlds(){
  for(int x = 0; x < WORLD_T_W; x++){
    for(int y = 0; y < WORLD_T_H; y++){
      float ap_x = SCREEN_W*(((float)x)/WORLD_T_W)+M;
      float ap_y = SCREEN_H*(((float)y)/WORLD_T_W)+M;
      worlds[x][y] = new World(WORLD_T_YSTART+WORLD_T_H-1-y,WORLD_T_XSTART+x,ap_x,ap_y,random(0,1));
    }
  }
}

void setup(){
  colorMode(HSB, 1);
  ellipseMode(RADIUS);
  createWorlds();
  BALL_COLOR = color(0.6,0.4,1.0);
  TEXT_COLOR = color(0.6,1.0,0.4);
  LINE_COLOR = color(0.5,1.0,1.0);

  size(1920,1080);

  sfx = new SoundFile[sfx_names.length];
  for(int i = 0; i < sfx_names.length; i++){
    sfx[i] = new SoundFile(this, sfx_names[i]+".wav");
  }
  output = createWriter(AUDIO_FILENAME); 
  
  if(SAVE_VIDEO){
    videoExport = new VideoExport(this, VIDEO_FILENAME);
    videoExport.setFrameRate(60);
    videoExport.startMovie();
  }
}
void draw(){
  doAllPhysics();
  drawAllFields();
  if(SAVE_VIDEO){
    videoExport.saveFrame();
  }
  if(frameCount%60 == 0){
    println((frameCount/60)+" seconds done.");
  }
}
void keyPressed() {
  if (key == 'q') {
    videoExport.endMovie();
    output.flush();  // Writes the remaining data to the file
    output.close();  // Finishes the file
    exit();  // Stops the program
  }
}
void doAllPhysics(){
  for(int x = 0; x < WORLD_T_W; x++){
    for(int y = 0; y < WORLD_T_H; y++){
      worlds[x][y].doNumPhysics();
    }
  }
}
void drawAllFields(){
  background(0,0,1);
  for(int x = 0; x < WORLD_T_W; x++){
    for(int y = 0; y < WORLD_T_H; y++){
      World w = worlds[x][y];
      w.drawField();
      image(worlds[x][y].canvas,w.ap_x,w.ap_y);
    }
  }
}




void drawUI(){
  fill(0,0,0,1);
  noStroke();
  rect(0,SCREEN_H,width,height-SCREEN_H);
  textAlign(LEFT);
  fill(0,0,1,1);
  textSize(64);
  text("Collatz Conjectures",40,height-40);
}

color changeHue(color c, float newHue){
  color newColor = color(newHue, saturation(c), brightness(c));
  return newColor;
}

float chainSizeToTime(int s){
  return CHAIN_TIME*pow(s,SPEED_UP_RATE);
}

float[] newCoor(){
  float[] result = {random(0.3,0.7)*WORLD_W,random(0.3,0.7)*WORLD_H,random(-1,1),random(-1,1)};
  return result;
}

void fuzz(float[] arr){
  arr[0] += random(-FUZZ_DIST, FUZZ_DIST);
  arr[1] += random(-FUZZ_DIST, FUZZ_DIST);
  cap(arr, 1);
}

void cap(float[] arr, float s){
  float[] limits = {RAD*s,RAD*s,WORLD_W-RAD*s,WORLD_H-RAD*s};
  capLimit(arr,limits);
}

String commafy(int n){
  String stri = n+"";
  String result = "";
  for(int i = 0; i < stri.length(); i++){
    if(i >= 1 && (stri.length()-i)%3 == 0){
      result += ",";
    }
    result += stri.charAt(i);
  }
  return result;
}

void capLimit(float[] arr, float limits[]){
  arr[0] = min(max(arr[0],limits[0]),limits[2]);
  arr[1] = min(max(arr[1],limits[1]),limits[3]);
  for(int d = 0; d < 2; d++){
    if(arr[d] == limits[d]){
      arr[d+2] = abs(arr[d+2]);
    }else if(arr[d] == limits[d+2]){
      arr[d+2] = -abs(arr[d+2]);
    }
  }
}
float[] deepCopy(float[] arr){
  float[] newArr = new float[arr.length];
  for(int i = 0; i < arr.length; i++){
    newArr[i] = arr[i];
  }
  return newArr;
}
boolean exists(ArrayList<Num> nums, int val, ArrayList<Integer> chain){
  if(getWithVal(nums, val) != null){
    return true;
  }
  if(chain != null){
    for(int i = 0; i < chain.size(); i++){
      if(chain.get(i) == val){
        return true;
      }  
    }
  }
  return false;
}
Num getWithVal(ArrayList<Num> nums, int val){
  for(int n = 0; n < nums.size(); n++){
     Num num = nums.get(n);
     if(val == num.val){
       return num;
     }
  }
  return null;
}
Num getClickResult(){
   for(int x = 0; x < WORLD_T_W; x++){
    for(int y = 0; y < WORLD_T_H; y++){
      World w = worlds[x][y];
      ArrayList<Num> nums = w.nums;
      for(int n = 0; n < nums.size(); n++){
        Num num = nums.get(n);
        float ap_x = w.ap_x+num.coor[0];
        float ap_y = w.ap_y+num.coor[1];
        float d = dist(mouseX, mouseY, ap_x, ap_y);
        if(d <= RAD){
          return num;
        }
      }
    }
  }
  return null;
}

void mousePressed(){
  dragging = getClickResult();
}
void mouseReleased(){
  dragging = null;
}

