class Scene::PostAboutUnpostedScenesJob < ApplicationJob
  queue_as :default

  def perform(*args) = Scene.unposted.find_each { |scene| scene.post_to_slack! }
end
