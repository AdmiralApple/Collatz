class World{
  int timer = 0;
  ArrayList<Num> nums = new ArrayList<Num>(0);
  ArrayList<Integer> chain = new ArrayList<Integer>(0);
  int lowestNonMade = 1;
  int a, b;
  boolean HIT_MAX = false;
  boolean HIT_MAX_VIS = false;
  int maxSoFar = 1;
  int frames = 0;
  float worldHue = 0;
  PGraphics canvas;
  
  float ap_x;
  float ap_y;
  
  public World(int a_, int b_, float ap_x_, float ap_y_, float stagger){
    a = a_;
    b = b_;
    ap_x = ap_x_;
    ap_y = ap_y_;
    timer += stagger*CREATE_EVERY;
    worldHue = (1.61803*(a+2*b)+0.5)%1.0;
    canvas = createGraphics((int)WORLD_W, (int)WORLD_H);
    canvas.beginDraw();
    canvas.colorMode(HSB, 1);
    canvas.ellipseMode(RADIUS);
    canvas.endDraw();
  }
  
  void freezeScreen(){
    if(!HIT_MAX_VIS){
      output.println(frameCount+",2,1.0");
    }
    HIT_MAX_VIS = true;
    for(int n = 0; n < nums.size(); n++){
      Num num = nums.get(n);
      cap(num.coor, num.getScale());
    }
  }
    
  void drawField(){
    canvas.beginDraw();
    canvas.background(worldHue,0.6,0.5);
    
    float FS = 100;
    canvas.textSize(FS);
    canvas.textAlign(CENTER);
    canvas.fill(0,0,1,0.34);
    canvas.text("y = "+a+"x + "+b,WORLD_W*0.5,WORLD_H*0.5+FS*0.3);
    
    for(int n = 0; n < nums.size(); n++){
       Num num = nums.get(n);
       num.drawNum();
    }
    if(HIT_MAX_VIS){
      canvas.fill(0.0,1.0,0.0,0.4);
      canvas.rect(0,0,WORLD_W,WORLD_H);
      
      FS = 100;
      canvas.textSize(FS);
      canvas.textAlign(CENTER);
      canvas.fill(0,0,1,1);
      canvas.text("INTEGER",WORLD_W*0.5,WORLD_H*0.5-FS*0.1);
      canvas.text("OVERFLOW",WORLD_W*0.5,WORLD_H*0.5+FS*0.9);
    }
    canvas.endDraw();
  }
  void doNumPhysics(){
    if(HIT_MAX_VIS){
      return;
    }
    for(int n = 0; n < nums.size(); n++){
       nums.get(n).applyForces(nums);
    }
    for(int n = 0; n < nums.size(); n++){
       nums.get(n).applyVelocities();
    }
    if(timer < 0){
      createNext();
      timer += CREATE_EVERY+chainSizeToTime(chain.size());
    }
    if(timer < CREATE_EVERY && timer+1 >= CREATE_EVERY){
      sfx[1].play();
      output.println(frameCount+",1,1.0");
    }
    timer--;
    frames++;
  }
  void createNext(){
    chain = new ArrayList<Integer>(0);
    
    int val = lowestNonMade;
    int iters = 0;
    int MAX_ITER = 1500;
    while(!exists(nums, val, chain) && iters < MAX_ITER && !HIT_MAX){
      chain.add(val);
      val = evaluate(val);
      if(val == Integer.MAX_VALUE){
        HIT_MAX = true;
      }
      iters++;
    }
    
    Num base = getWithVal(nums, val);
    int base_blink = 0;
    if(base != null){
      base_blink = base.blink;
    }
    for(int i = 0; i < chain.size(); i++){
      int newBlink = (base_blink+(chain.size()-i))%BLINK_COUNT;
      Num newNum = new Num(chain.get(i), i, newBlink, this);
      nums.add(newNum);
    }
    float[] coor = newCoor();
    if(base != null){
      coor = deepCopy(base.coor);
    }
    for(int i = chain.size()-1; i >= 0; i--){
      int thisVal = chain.get(i);
      Num num = getWithVal(nums, thisVal);
      num.pointer = getWithVal(nums, evaluate(thisVal));
      fuzz(coor);
      num.coor = deepCopy(coor);
    }
    setLowestNonmade();
  }
  void setLowestNonmade(){
    while(exists(nums, lowestNonMade, null)){
      lowestNonMade += 1;
    }
  }
  int evaluate(int val){
    if(val%2 == 0){
      return val/2;
    }else{
      if(a >= 1 && val >= (Integer.MAX_VALUE-1)/a){
        return Integer.MAX_VALUE;
      }
      return val*a+b;
    }
  }
}
