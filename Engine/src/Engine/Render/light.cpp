﻿#include "light.hpp"
#include "render_manager.hpp"

namespace LowRenderer
{
	Light::Light(Engine::GameObject& gameObject)
		: Light(gameObject, std::shared_ptr<Light>(this))
	{
		// TODO: add light to the Render Manager
		//LowRenderer::RenderManager::addLight();
	}

	Light::Light(Engine::GameObject& gameObject, const std::shared_ptr<Light>& ptr)
		: Component(gameObject, ptr)
	{
		LowRenderer::RenderManager::addLight(ptr);
	}


	void Light::setAsDirectionnal()
	{
		position.w = 0.f;

		cutoff = Core::Maths::PI;
		outterCutoff = Core::Maths::PI;
	}

	void Light::setAsPoint()
	{
		position.w = 1.f;

		cutoff = Core::Maths::PI;
		outterCutoff = Core::Maths::PI;
	}

	void Light::setAsSpot()
	{
		position.w = 1.f;

		cutoff = Core::Maths::PIO4;
		outterCutoff = 50.f * Core::Maths::DEG2RAD;
	}



	void Light::compute()
	{
		// TODO
		enable = (float)isActive();
		//position.xyz = transform.position;
	}

	void Light::draw()
	{
		Core::Debug::Log::info("Je suis une lumière :D");
	}
}