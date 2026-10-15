"""Native GLSL pixel regression. Requires Mesa EGL and NumPy in the QA image."""
import ctypes as C
from pathlib import Path
import numpy as np

E=C.CDLL('libEGL.so.1');G=C.CDLL('libGL.so.1')
P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float
def api(lib,name,result,args):
    fn=getattr(lib,name);fn.restype=result;fn.argtypes=args;return fn
display=api(E,'eglGetPlatformDisplay',P,[U,P,P])(0x31DD,None,None)
a=I();b=I();assert api(E,'eglInitialize',U,[P,P,P])(display,C.byref(a),C.byref(b))
assert api(E,'eglBindAPI',U,[U])(0x30A2)
attrs=(I*7)(0x3033,1,0x3040,8,0x3024,8,0x3038);config=P();count=I()
assert api(E,'eglChooseConfig',U,[P,P,P,I,P])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
context=api(E,'eglCreateContext',P,[P,P,P,P])(display,config,None,(I*5)(0x3098,4,0x30FB,5,0x3038))
assert context and api(E,'eglMakeCurrent',U,[P,P,P,P])(display,None,None,context)
print('Native filter renderer:',api(G,'glGetString',C.c_char_p,[U])(0x1F02).decode())
create_shader=api(G,'glCreateShader',U,[U]);source_shader=api(G,'glShaderSource',None,[U,I,P,P])
compile_shader=api(G,'glCompileShader',None,[U]);shader_status=api(G,'glGetShaderiv',None,[U,U,P])
shader_log=api(G,'glGetShaderInfoLog',None,[U,I,P,P])
program=api(G,'glCreateProgram',U,[])();root=Path(__file__).resolve().parent.parent/'.qa/shadow-filter'
for suffix,kind in [('vert',0x8B31),('frag',0x8B30)]:
    shader=create_shader(kind);data=C.c_char_p((root/('filter.'+suffix)).read_bytes())
    source_shader(shader,1,C.byref(data),None);compile_shader(shader);ok=I();shader_status(shader,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(32768);shader_log(shader,len(log),None,log);raise RuntimeError(log.value.decode())
    api(G,'glAttachShader',None,[U,U])(program,shader)
api(G,'glLinkProgram',None,[U])(program);ok=I();api(G,'glGetProgramiv',None,[U,U,P])(program,0x8B82,C.byref(ok))
if not ok.value:
    log=C.create_string_buffer(32768);api(G,'glGetProgramInfoLog',None,[U,I,P,P])(program,len(log),None,log);raise RuntimeError(log.value.decode())
api(G,'glUseProgram',None,[U])(program)
bind_texture=api(G,'glBindTexture',None,[U,U]);image_texture=api(G,'glTexImage2D',None,[U,I,I,I,I,I,U,U,P])
param_texture=api(G,'glTexParameteri',None,[U,U,I]);gen_texture=api(G,'glGenTextures',None,[I,P])
output=U();depth=U();gen_texture(1,C.byref(output));gen_texture(1,C.byref(depth))
def upload(texture,data,internal=0x822E,format_=0x1903):
    bind_texture(0x0DE1,texture);param_texture(0x0DE1,0x2801,0x2600);param_texture(0x0DE1,0x2800,0x2600)
    param_texture(0x0DE1,0x2802,0x812F);param_texture(0x0DE1,0x2803,0x812F)
    image_texture(0x0DE1,0,internal,data.shape[1],data.shape[0],0,format_,0x1406,data.ctypes.data)
size=128;upload(output,np.zeros((size,size,4),dtype=np.float32),0x8814,0x1908)
framebuffer=U();api(G,'glGenFramebuffers',None,[I,P])(1,C.byref(framebuffer));api(G,'glBindFramebuffer',None,[U,U])(0x8D40,framebuffer)
api(G,'glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,output,0)
assert api(G,'glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5
vao=U();api(G,'glGenVertexArrays',None,[I,P])(1,C.byref(vao));api(G,'glBindVertexArray',None,[U])(vao)
api(G,'glViewport',None,[I,I,I,I])(0,0,size,size)
location=api(G,'glGetUniformLocation',I,[U,C.c_char_p]);one_float=api(G,'glUniform1f',None,[I,F]);one_int=api(G,'glUniform1i',None,[I,I]);vector=api(G,'glUniform3f',None,[I,F,F,F])
draw=api(G,'glDrawArrays',None,[U,I,I]);read=api(G,'glReadPixels',None,[I,I,I,I,U,U,P])
one_int(location(program,b'depthMap'),0)
def evaluate(data,resolution,mode,origin=(0,0,0),u=(1,0,0),v=(0,1,0)):
    upload(depth,np.ascontiguousarray(data,dtype=np.float32));one_float(location(program,b'resolution'),resolution);one_int(location(program,b'mode'),mode)
    for name,value in [(b'origin',origin),(b'axisU',u),(b'axisV',v)]:vector(location(program,name),*value)
    draw(0x0004,0,3);pixels=np.empty((size,size,4),dtype=np.float32);read(0,0,size,size,0x1908,0x1406,pixels.ctypes.data)
    assert np.isfinite(pixels).all();return pixels[:,:,0]
def cube_depth(resolution,origin,u,v,blocker=0):
    n=np.cross(u,v);n=n/np.linalg.norm(n);plane=np.dot(origin,n)
    if blocker:plane-=np.sign(plane)*blocker
    q=(np.arange(resolution)+.5)/resolution*2-1;x,y=np.meshgrid(q,q)
    atlas=np.ones((resolution*2,resolution*4),dtype=np.float32)
    faces=[(2,1,(np.ones_like(x),y,x)),(0,1,(-np.ones_like(x),y,-x)),(3,1,(-x,y,np.ones_like(x))),
           (1,1,(x,y,-np.ones_like(x))),(3,0,(x,np.ones_like(x),y)),(1,0,(x,-np.ones_like(x),-y))]
    for col,row,components in faces:
        ray=np.stack(components,axis=-1);ray/=np.linalg.norm(ray,axis=-1,keepdims=True)
        denom=ray@n
        with np.errstate(divide='ignore',invalid='ignore'):distance=plane/denom
        values=np.where((distance>=.06)&(distance<=18),(distance-.06)/(18-.06),1)
        atlas[row*resolution:(row+1)*resolution,col*resolution:(col+1)*resolution]=values
    return atlas
for resolution in [192,256,384]:
    for name,origin,u,v in [('front wall',(1.8,.3,-3.5),(4.,0,0),(0,3.,0)),
                           ('side wall',(3.5,.3,1.8),(0,0,4.),(0,3.,0)),
                           ('rear wall',(-1.8,.3,3.5),(-4.,0,0),(0,3.,0)),
                           ('west wall',(-3.5,.3,-1.8),(0,0,-4.),(0,3.,0)),
                           ('floor/grass',(.8,-2.4,1.5),(4.,0,0),(0,0,-4.)),
                           ('ceiling',(.8,2.4,-1.5),(4.,0,0),(0,0,4.))]:
        lit=evaluate(cube_depth(resolution,origin,u,v),resolution,0,origin,u,v)
        assert lit.mean()>.999, f'{name} at {resolution}: self-shadow acne (mean visibility {lit.mean():.3f})'
        blocked=evaluate(cube_depth(resolution,origin,u,v,.02),resolution,0,origin,u,v)
        assert blocked.mean()<.001, f'{name} at {resolution}: 2cm blocker leaks light ({blocked.mean():.3f})'
    print('PASS: point shadows',resolution,'px — clean wall/floor/grass/ceiling receivers; 2cm blockers remain opaque.')
for resolution in [384,512,768,1024,2048]:
    q=(np.arange(resolution)+.5)/resolution;x,y=np.meshgrid(q,q);plane=.55+.28*x-.21*y
    lit=evaluate(plane,resolution,1);blocked=evaluate(plane-.00005,resolution,1)
    assert lit.mean()>.999, f'Moon/flashlight self-shadow acne at {resolution} ({lit.mean():.3f})'
    assert blocked.mean()<.001, f'Moon/flashlight thin blocker leaks at {resolution}'
print('PASS: moon/flashlight filters — clean sloped receivers and opaque nearby blockers at every quality resolution.')
api(E,'eglMakeCurrent',U,[P,P,P,P])(display,None,None,None)
api(E,'eglDestroyContext',U,[P,P])(display,context);api(E,'eglTerminate',U,[P])(display)
