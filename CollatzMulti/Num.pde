class Num{
  float[] coor = {0,0,0,0};
  int val = 0;
  float birthTime = 0;
  float activeTime = 0;
  int blink = 0;
  int queue_pos;
  boolean audioPlayed = false;
  World world;
  Num pointer;
  PGraphics wc;
  public Num(int VAL, int QP, int BLINK, World world_){
    val = VAL;
    blink = BLINK;
    queue_pos = QP;
    birthTime = frameCount+chainSizeToTime(queue_pos);
    activeTime = frameCount+chainSizeToTime(queue_pos+1);
    world = world_;
    wc = world.canvas;
  }
  float d(float[] c1, float[] c2){
    return dist(c1[0],c1[1],c2[0],c2[1]);
  }
  
  void applyForce(Num n1, Num n2, float target, boolean isArrow){
    if(n1 == null || n2 == null){
      return;
    }
    if(!n1.active() || !n2.active()){
      return;
    }
    float[] c1 = n1.coor;
    float[] c2 = n2.coor;
    float _dist = d(c1,c2);
    float force_multiplier = _dist-target;
    if(!isArrow){
      force_multiplier = -pow(0.2,_dist/TARGET_DIST)*70;
    }
    float x_part = (c2[0]-c1[0])/_dist;
    float y_part = (c2[1]-c1[1])/_dist;
    float dvx = (x_part)*force_multiplier*ARROW_FORCE;
    float dvy = (y_part)*force_multiplier*ARROW_FORCE;
    c1[2] += dvx;
    c1[3] += dvy;
    c2[2] -= dvx;
    c2[3] -= dvy;
  }
  
  boolean born(){
    return (frameCount >= birthTime);
  }
  boolean active(){
    return (frameCount >= activeTime);
  }
  float getScale(){
    if(!active()){
      return 3*(1-pow(0.7,frameCount-birthTime));
    }else{
      return 1+2*pow(0.7,frameCount-activeTime);
    }
  }
  void applyForces(ArrayList<Num> nums){
    if(born() && val > world.maxSoFar){
      world.maxSoFar = val;
    }
    if(!active()){
      return;
    }
    if(this != pointer &&
    (this.val < pointer.val || this != pointer.pointer)){ // this line ensures a 2-cycle doesn't pull together twice as hard
      applyForce(this,pointer,TARGET_DIST,true);
    }
    for(int n = 0; n < nums.size(); n++){
      Num other = nums.get(n);
      if(other.val > val || other == this || !other.born()){
        continue;
      }
      applyForce(this,other,TARGET_DIST,false);
    }
    
    // force to keep nodes off the center equation
    float AVOID_EQUATION_FORCE = 0.05;
    float y_frac = coor[1]/WORLD_H;
    if(y_frac >= 0.3 && y_frac <= 0.5){
      float fac = 0.8+0.2*(y_frac-0.3)/(0.5-0.3);
      coor[3] -= AVOID_EQUATION_FORCE*fac;
    }else if(y_frac >= 0.5 && y_frac <= 0.7){
      float fac = 0.8+0.2*(0.7-y_frac)/(0.7-0.5);
      coor[3] += AVOID_EQUATION_FORCE*fac;
    }
    float x_frac = coor[0]/WORLD_W;
    if(x_frac >= 0.2 && x_frac <= 0.35){
      float fac = 0.8+0.2*(x_frac-0.2)/(0.35-0.2);
      coor[2] -= AVOID_EQUATION_FORCE*fac;
    }else if(x_frac >= 0.65 && x_frac <= 0.8){
      float fac = 0.8+0.2*(0.8-x_frac)/(0.8-0.65);
      coor[2] += AVOID_EQUATION_FORCE*fac;
    }
    
    if(coor[0] < TARGET_DIST){
      coor[2] += (TARGET_DIST-coor[0])*SIDE_FORCE;
    }else if(coor[0] > WORLD_W-TARGET_DIST){
      coor[2] += (WORLD_W-TARGET_DIST-coor[0])*SIDE_FORCE;
    }
    if(coor[1] < TARGET_DIST){
      coor[3] += (TARGET_DIST-coor[1])*SIDE_FORCE;
    }else if(coor[1] > WORLD_H-TARGET_DIST){
      coor[3] += (WORLD_H-TARGET_DIST-coor[1])*SIDE_FORCE;
    }
    
    coor[2] *= FRICTION;
    coor[3] *= FRICTION;
    
  }
  void applyVelocities(){
    coor[0] += coor[2];
    coor[1] += coor[3];
    if(dragging == this){
      coor[0] = mouseX-world.ap_x;
      coor[1] = mouseY-world.ap_y;
      coor[2] = 0;
      coor[3] = 0;
    }
    cap(coor, getScale());
  }
  
  void drawNum(){
    if(!born()){
      return;
    }
    if(!audioPlayed){
      audioPlayed = true;
      float rate = 0.7*min(4.0,pow(1.0595,queue_pos));
      sfx[0].rate(rate);
      sfx[0].play();
      output.println(frameCount+",0,"+rate);
    }
    if(pointer != null && pointer.born()){
      drawArrow(coor,pointer.coor);
    }
    if(born() && pointer == null && world.HIT_MAX){
      world.freezeScreen();
    }
    wc.pushMatrix();
    wc.translate(coor[0],coor[1]);
    float age = frameCount-birthTime;
    if(age < 30){
      wc.noStroke();
      wc.fill(0,0,1,1-age/30.0);
      float out = 0.3*age+1;
      wc.ellipse(0,0,RAD*out,RAD*out);
    }
    wc.scale(getScale());
    wc.noStroke();
    wc.fill(0,0,0,0.5);
    wc.ellipse(3,3,RAD,RAD);
    float hue = 0.666-0.666*(sqrt(val)-1.0)/(sqrt(world.maxSoFar));
    wc.fill(changeHue(BALL_COLOR, hue));
    if((world.frames/BLINK_SPEED)%BLINK_COUNT == BLINK_COUNT-1-blink){
      wc.fill(0,0,1,1.0);
    }
    wc.ellipse(0,0,RAD,RAD);
    wc.fill(changeHue(TEXT_COLOR, hue));
    wc.textAlign(CENTER);
    
    String valStr = commafy(val);
    
    float FS = 22;
    wc.textSize(FS);
    float MAX_W = RAD*1.76;
    if(wc.textWidth(valStr) >= MAX_W){
      FS /= wc.textWidth(valStr)/MAX_W;
    }
    
    wc.textSize(FS);
    wc.text(valStr,0,FS*0.3);
    wc.popMatrix();
  }
  void drawArrow(float[] c1, float[] c2){
    float _dist = d(c1,c2);
    float angle = atan2(c2[1]-c1[1], c2[0]-c1[0]);
    
    wc.stroke(LINE_COLOR);
    wc.strokeWeight(3);
    wc.pushMatrix();
    wc.translate(c1[0],c1[1]);
    wc.rotate(angle);
    
    if(_dist == 0){
      int P = 20;
      float[] alts = new float[P+1];
      float[] angs = new float[P+1];
      for(int p = 0; p <= P; p++){
        float prog = ((float)p)/P;
        alts[p] = RAD*sin(prog*PI);
        angs[p] = 2*PI*(0.5+prog*0.25);
      }
      for(int p = 0; p < P; p++){
        float x1 = (RAD+alts[p])*cos(angs[p]);
        float y1 = (RAD+alts[p])*sin(angs[p]);
        
        float x2 = (RAD+alts[p+1])*cos(angs[p+1]);
        float y2 = (RAD+alts[p+1])*sin(angs[p+1]);
        wc.line(x1,y1,x2,y2);
      }
      wc.line(_dist-RAD,0,_dist-RAD-ARROW_R*1.3,ARROW_R*0.6);
      wc.line(_dist-RAD,0,_dist-RAD-ARROW_R*0.3,-ARROW_R*1.7);
    }else{
      wc.line(RAD,0,_dist-RAD,0);
      wc.line(_dist-RAD,0,_dist-RAD-ARROW_R,ARROW_R);
      wc.line(_dist-RAD,0,_dist-RAD-ARROW_R,-ARROW_R);
    }
    wc.popMatrix();
  }
}
