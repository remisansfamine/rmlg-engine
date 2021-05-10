#version 450 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aTexCoords;

out vec3 TexCoords;

uniform mat4 viewOrtho;
uniform mat4 model;

void main()
{
   gl_Position = viewOrtho * model * vec4(aPos.xy, 0.0, 1.0);
   TexCoords = aTexCoords;
}