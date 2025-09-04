class Scene::UpdateManifestFromGitHubJob < ApplicationJob
  queue_as :default

  def perform(*args)
    data = Faraday.get("#{Rails.application.credentials.dig(:github, :pages_base_url)}manifest.json", headers: { user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" }).body
    Scenecore.import_from_json(data)
  end
end
