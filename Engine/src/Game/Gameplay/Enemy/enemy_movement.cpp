#include "enemy_movement.hpp"

#include "collider.hpp"

namespace Gameplay
{
	EnemyMovement::EnemyMovement(Engine::GameObject& gameObject)
		: EntityMovement(gameObject, std::shared_ptr<EnemyMovement>(this))
	{
		m_enemyState = requireComponent<Gameplay::EnemyState>();
		m_transform = m_enemyState->transform;
	}

	void EnemyMovement::onTriggerStay(Physics::Collider* collider)
	{
		if (collider->getHost().m_name == "Player")
		{
			m_rigidbody->velocity.x = m_enemyState->horizontalMove * m_speed;
			m_rigidbody->velocity.z = m_enemyState->forwardMove * m_speed;

			m_enemyState->isWalking = true;
		}
	}

	void EnemyMovement::onTriggerExit(Physics::Collider* collider)
	{
		if (collider->getHost().m_name == "Player")
			m_rigidbody->velocity = {0, 0, 0};
	}

	void EnemyMovement::drawImGui()
	{
		if (ImGui::TreeNode("EnemyMovement"))
		{
			ImGui::DragFloat("MoveSpeed : ", &m_speed);
			ImGui::TreePop();
		}
	}

	std::string EnemyMovement::toString() const
	{
		return "COMP ENEMYMOVEMENT " + std::to_string(m_speed);
	}

	void EnemyMovement::parseComponent(Engine::GameObject& gameObject, std::istringstream& iss)
	{
		gameObject.addComponent<EnemyMovement>();
		auto enemy = gameObject.getComponent<EnemyMovement>();

		iss >> enemy->m_speed;
	}
}
