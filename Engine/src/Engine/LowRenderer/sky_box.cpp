#include "sky_box.hpp"

#include "resources_manager.hpp"
#include "render_manager.hpp"

namespace LowRenderer
{
	SkyBox::SkyBox(Engine::Entity& owner, const std::vector<std::string>& paths)
		: Component(owner)
	{
		// Delegation block other members initialization
		cubeMap = Resources::ResourcesManager::loadCubeMap(paths);
		skyPaths = paths;

		cubeMesh = Resources::ResourcesManager::getMeshByName("cube");
		m_shaderProgram = Resources::ResourcesManager::loadShaderProgram("skyBox");
		LowRenderer::RenderManager::linkComponent(this);
	}

	SkyBox::~SkyBox()
	{
		//Core::Debug::Log::info("Unload model " + cubeMap;
	}

	void SkyBox::draw() const
	{
		glDepthFunc(GL_LEQUAL);

		m_shaderProgram->bind();

		Camera* cam = LowRenderer::RenderManager::getCurrentCamera();

		Core::Maths::mat4 newView =  Core::Maths::toMat4(Core::Maths::toMat3(cam->getViewMatrix()));
		m_shaderProgram->setUniform("viewProj", (cam->getProjection() * newView).e, true, 1, 1);

		m_shaderProgram->setSampler("cubemap", cubeMap->getID());
		glActiveTexture(0);

		cubeMesh->draw();

		m_shaderProgram->unbind();

		glDepthFunc(GL_LESS);
	}

	std::string SkyBox::toString() const
	{
		std::string strParse = "COMP SKYBOX";

		for (int i = 0; i < skyPaths.size(); i++)
			strParse += " " + skyPaths[i];

		return strParse;
	}

	void SkyBox::parseComponent(Engine::Entity& owner, std::istringstream& iss)
	{
		std::vector<std::string> paths;
		std::string curPath;

		for (int i = 0; i < 6; i++)
		{
			iss >> curPath;
			paths.push_back(curPath);
		}

		owner.addComponent<SkyBox>(paths);
	}

	void SkyBox::sendToProgram(std::shared_ptr<Resources::ShaderProgram> program) const
	{
		program->setSampler("environmentMap", cubeMap->getID());
		glActiveTexture(0);
	}
}