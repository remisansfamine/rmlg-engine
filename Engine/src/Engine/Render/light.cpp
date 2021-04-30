﻿#include "light.hpp"
#include "render_manager.hpp"

#include "inputs_manager.hpp"

namespace LowRenderer
{
	Light::Light(Engine::GameObject& gameObject)
		: Light(gameObject, std::shared_ptr<Light>(this))
	{ }

	Light::Light(Engine::GameObject& gameObject, const std::shared_ptr<Light>& ptr)
		: Component(gameObject, ptr)
	{
		LowRenderer::RenderManager::linkComponent(ptr);
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
		// TODO: REMOVE THAT
		if (Core::Input::InputManager::getButtonDown("Jump"))
			Core::Debug::Log::info("IVE BEEN PRESSED");

		if (Core::Input::InputManager::getButtonUp("Jump"))
			Core::Debug::Log::info("IVE BEEN RELEASED YOUHOUH");
	}
}