var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
    Ray ray;
    HitInfo hit;
    vec3 color = vec3(0,0,0);
        for ( int i=0; i<NUM_LIGHTS; ++i ) {
        
        // TO-DO: Check for shadows
        //set light ray
        ray.pos = position;
        ray.dir = lights[i].position - position;
        //set current hit info
        if(IntersectRay(hit, ray)) {
            continue;
        }
  
        //TO-DO: If not shadowed, perform shading using the Blinn model
        float cosphi = dot(normal, normalize(ray.dir + view)); //dot product of surface normal and half angle
        float costheta = dot(normal, normalize(ray.dir)); //dot product of surface normal and light source
        
        vec3 blinnphong = lights[i].intensity * max(0.0, costheta) + mtl.k_s * pow(max(0.0, cosphi), mtl.n);
        color += mtl.k_d * lights[i].intensity * max(0.0, costheta) * blinnphong;
    }
    return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
    hit.t = 1e30;
    float bias = 1e-6;
    bool foundHit = false;
    //for the number of spheres in the project
    for ( int i=0; i<NUM_SPHERES; ++i ) {
 
        Sphere currentSphere = spheres[i];
        vec3 d = ray.dir;
        vec3 p = ray.pos;
        vec3 center = currentSphere.center;
        float a = dot(d, d);
        float b = 2.0 * dot(d, (p - center));
        float c = dot((p - center), (p - center)) - (currentSphere.radius * currentSphere.radius);
        float delta = (b * b) - (4.0 * a * c);
        
        //if ray intersects with a primitive
        if(delta >= 0.0) {
        float t = ( -b - sqrt(delta) ) / (2.0 * a);
            //if CLOSEST hit
            if(t < hit.t && t > bias) {
                //update the given HitInfo
                hit.t = t;
                hit.position = (p + (t * d));
                hit.normal = normalize(hit.position - center);
                hit.mtl = currentSphere.mtl;
                foundHit = true;
            }
        }
    }
    return foundHit;
}
// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			// TO-DO: Initialize the reflection ray
			r.dir = 2.0 * dot(view, hit.normal) * hit.normal - view;
			r.pos = hit.position;
			
			if ( IntersectRay( h, r ) ) {
				// TO-DO: Hit found, so shade the hit point
				view = normalize( -r.dir );
				clr +=  k_s * Shade(h.mtl, h.position, h.normal, view);
				
				// TO-DO: Update the loop variables for tracing the next reflection ray
				hit = h;
				//ray = r;
				k_s = k_s * h.mtl.k_s;
			} else {
				// The reflection ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;