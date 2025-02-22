#version 450 core

#define LIGHT_COUNT 8
#define BLINN_PHONG

//#define USE_NORMAL_MAP

#define PCF 1
#define PCFSampleCount (1 + 2 * PCF) * (1 + 2 * PCF)
#define PCFFactor 1.0 / (PCFSampleCount)

//#define USE_UBO

in VS_OUT
{
	vec3 FragPos;
	vec3 TangentFragPos;
	vec3 TexCoord;
	vec3 TangentViewPos;
	vec3 Normal;
	vec3 Tangent;
	vec3 Bitangent;
	mat3 TBN;
} fs_in;

uniform struct Material
{
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
	vec4 emissive;
	float shininess;
	float refractiveIndex;

	sampler2D alphaTexture;
	sampler2D ambientTexture;
	sampler2D diffuseTexture;
	sampler2D emissiveTexture;
	sampler2D specularTexture;
	sampler2D normalMap;
} material;

struct Light
{
	vec3 position;
	bool isPoint;
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;

	vec3 attenuation;
	float spotCutoff;

	vec3 spotDirection;
	float spotOuterCutoff;

	bool enable;
	bool hasShadow;
	
	mat4 spaceMatrix;
} lights[LIGHT_COUNT];

layout(std140) uniform lightBlock
{
    Light lightBuffer[LIGHT_COUNT];
};

uniform vec3 viewPos;
uniform float farPlane;

uniform float maxBias;
uniform float minBias;

uniform mat4 lightAttribs1[LIGHT_COUNT][1];
uniform mat4 lightAttribs2[LIGHT_COUNT][1];
uniform mat4 lightAttribs3[LIGHT_COUNT][1];
uniform sampler2D shadowMaps[LIGHT_COUNT][1];
uniform samplerCube shadowCubeMaps[LIGHT_COUNT][1];

uniform samplerCube environmentMap;

vec3 normal;
vec3 viewDir = normalize(fs_in.TangentFragPos - fs_in.TangentViewPos);

out vec4 FragColor;

void parseLights()
{
	// Parse each light matrix to a light struct
	for (int i = 0; i < LIGHT_COUNT; i++)
	{
		lights[i].position	= lightAttribs1[i][0][0].xyz;
		lights[i].isPoint	= bool(lightAttribs1[i][0][0].w);
		lights[i].ambient	= lightAttribs1[i][0][1];
		lights[i].diffuse	= lightAttribs1[i][0][2];
		lights[i].specular	= lightAttribs1[i][0][3];

		lights[i].attenuation		= vec3(lightAttribs2[i][0][0]);
		lights[i].spotCutoff		= cos(lightAttribs2[i][0][0][3]);
		lights[i].spotDirection		= vec3(lightAttribs2[i][0][1]);
		lights[i].spotOuterCutoff	= cos(lightAttribs2[i][0][1][3]);
		lights[i].enable			= bool(lightAttribs2[i][0][2][0]);
		lights[i].hasShadow			= bool(lightAttribs2[i][0][2][1]);

		lights[i].spaceMatrix = lightAttribs3[i][0];
	}
}

float getDirectionalShadow(in Light light, int index)
{
	// Perspcetive divide
	vec4 fragPosLightSpace = light.spaceMatrix * vec4(fs_in.FragPos, 1.0);
	vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

	// Avoid shadow out of the frustum
	if (projCoords.z > 1.0)
		return 0.0;

	// [0,1]
	projCoords = projCoords * 0.5 + 0.5;

	vec3 lightDir = normalize(light.position - fs_in.FragPos);

	float slopeFactor = 1.0 - dot(normal, lightDir);

	float bias = max(minBias * slopeFactor, maxBias);
	float currentDepth = projCoords.z - bias;

	// Apply Percentage-Closer filtering to avoid "stair" shadows
	// Use to soft shadow boders
	float shadow = 0.0;
		
	// Calculate the texel size from the depth texture size
	vec2 texelSize = 1.0 / textureSize(shadowMaps[index][0], 0);
		
	for (int x = -PCF; x <= PCF; x++)
	{
		for (int y = -PCF; y <= PCF; y++)
		{
			float pcfDepth = texture(shadowMaps[index][0], projCoords.xy + vec2(x, y) * texelSize).r;

			// Compare pcf and current depth of fragment to determine shadow
			shadow += float(currentDepth > pcfDepth);
		}
	}

	return shadow * PCFFactor;

}

vec3 sampleOffsetDirections[20] = vec3[]
(
   vec3(1, 1,  1), vec3( 1, -1,  1), vec3(-1, -1,  1), vec3(-1, 1,  1), 
   vec3(1, 1, -1), vec3( 1, -1, -1), vec3(-1, -1, -1), vec3(-1, 1, -1),
   vec3(1, 1,  0), vec3( 1, -1,  0), vec3(-1, -1,  0), vec3(-1, 1,  0),
   vec3(1, 0,  1), vec3(-1,  0,  1), vec3( 1,  0, -1), vec3(-1, 0, -1),
   vec3(0, 1,  1), vec3( 0, -1,  1), vec3( 0, -1, -1), vec3( 0, 1, -1)
);

float getPointShadow(int indexLight)
{
	vec3 fragToLight = fs_in.FragPos - lights[indexLight].position.xyz;
	float currentDepth = length(fragToLight);

	float shadow = 0.0;
	float bias = 0.15;
	int samples = 20;
	float viewDistance = length(fs_in.TangentViewPos - fs_in.FragPos);
	float diskRadius = (1.0 + (viewDistance / farPlane)) / 25.0;
	for (int i = 0; i < samples; i++)
	{
		float closestDepth = texture(shadowCubeMaps[indexLight][0], fragToLight + sampleOffsetDirections[i] * diskRadius).r;
		closestDepth *= farPlane;
		if (currentDepth - bias > closestDepth)
			shadow += 1.0;
	}

	shadow /= float(samples);

	return shadow;
}

float getShadow(in Light light, int index)
{
	return getDirectionalShadow(light, index);
	/*if (lights[indexLight].position.w == 0.0)
		return getDirectionalShadow(indexLight);

	return getPointShadow(indexLight);*/
}

void getLightColor(in Light light, int index, inout vec4 ambient, inout vec4 diffuse, inout vec4 specular, inout float shadow)
{
	if (!light.enable)
		return;

	if (light.hasShadow)
	{
		shadow -= getShadow(light, index);

		//if (shadow > 1.0)
		//	shadow = 1.0;
	}

	// Get light direction, if the light is a point light or a directionnal light
	vec3 lightDir = fs_in.TBN * light.position - float(light.isPoint) * fs_in.TangentFragPos;
	
	// Compute the light direction and the distance between the fragment and the light
	float distance = length(lightDir);

	// Normalize the light direction manually
	lightDir /= distance;

	float finalIntensity = 1.0;

	// If the light is not a directionnal light, compute the final intensity
	if (light.isPoint)
	{
		// Get spot cutoff and spot intensity 
		float theta = -dot(lightDir, normalize(light.spotDirection));
		float spotIntensity = clamp((theta - light.spotOuterCutoff) / (light.spotCutoff - light.spotOuterCutoff), 0.0, 1.0);

		// Get attenuation (c + l * d + q * d�)
		float attenuation = dot(light.attenuation, vec3(1.0, distance, distance * distance));

		// Apply attenuation  to the spot intensity
		finalIntensity = spotIntensity / attenuation;
	}

	// Compute ambient
	ambient += light.ambient;

	// Pre-compute normal �ElightDir
	float NdotL = dot(normal, lightDir);

	float diffuseValue = NdotL * finalIntensity;

	if (diffuseValue <= 0.0)
		return;

	// Compute diffuse
	diffuse += diffuseValue * light.diffuse;

	// Compute specular

	#ifdef BLINN_PHONG
		// Blinn phong
		vec3 halfwayDir = normalize(lightDir - viewDir);
		float dotValue = dot(normal, halfwayDir);
	#else
		// Phong
		vec3 reflectDir = lightDir - 2.0 * NdotL * normal; 
		float dotValue = dot(viewDir, reflectDir);
	#endif

	specular += pow(max(dotValue, 0.0), material.shininess) * finalIntensity * light.specular;
}

void getLightsSumColor(out vec4 ambient, out vec4 diffuse, out vec4 specular, out float shadow)
{
	ambient = diffuse = specular = vec4(0.0, 0.0, 0.0, 1.0);

	shadow = 1.0;

	for (int i = 0; i < LIGHT_COUNT; i++)
	{
		// TODO: remove this
		#ifdef USE_UBO
			getLightColor(lightBuffer[i], i, ambient, diffuse, specular, shadow);
		#else
			getLightColor(lights[i], i, ambient, diffuse, specular, shadow);
		#endif
	}

	shadow = clamp(shadow, 0.0, 1.0);
}

vec4 getReflectEMColor()
{
	vec3 reflected = reflect(viewDir, normal);

	return texture(environmentMap, reflected);
}

vec4 getRefractedEMColor()
{
	float ratio = 1.0 / material.refractiveIndex;
	vec3 refracted = refract(viewDir, normal, ratio);

	return texture(environmentMap, refracted);
}

vec4 getEnvironmentColor()
{
	vec4 reflectedEMColor = getReflectEMColor();
	vec4 refractedEMColor = getRefractedEMColor();

	return mix(reflectedEMColor, refractedEMColor, 0);
}

vec4 getShadedColor()
{
	vec4 ambient, diffuse, specular;
	float shadow;

	getLightsSumColor(ambient, diffuse, specular, shadow);

	vec4 ambientColor = ambient * (material.ambient + texture(material.ambientTexture, fs_in.TexCoord.st));

	vec4 diffuseColor = material.diffuse * diffuse * shadow;

	vec4 specularColor = specular * (material.specular + texture(material.specularTexture, fs_in.TexCoord.st));

	vec4 emissiveColor = material.emissive + texture(material.emissiveTexture, fs_in.TexCoord.st);

	return (ambientColor + diffuseColor) * texture(material.diffuseTexture, fs_in.TexCoord.st) + emissiveColor + specularColor;
}

float getAlphaValue()
{
	return texture(material.alphaTexture, fs_in.TexCoord.st).r;
}

void setNormal()
{
	#ifdef USE_NORMAL_MAP
		normal = texture(material.normalMap, fs_in.TexCoord.st).rgb * 2.0 - 1.0;
	#else
		normal = fs_in.Normal;
	#endif

	normal = normalize(normal);
}

void main()
{
	parseLights();

	// Initialize some variables to avoid to calculate them another time
	setNormal();

	// Get texture color applied to the light
	vec4 shadedColor = getShadedColor();
	vec4 environmentColor = getEnvironmentColor();

	vec4 finalColor = mix(shadedColor, environmentColor, 0);

	FragColor.rgb = finalColor.rgb;

	FragColor.a = getAlphaValue();
}