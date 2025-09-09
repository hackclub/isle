module GitHubService
  class << self
    # Returns an array of completed scene IDs (directory names under scenes/ in the external repo)
    # Caches aggressively for 1 hour to avoid GitHub API rate limits.
    def completed_scene_ids
        # Rails.cache.fetch("github.completed_scene_ids", expires_in: 1.hour) do
        fetch_completed_scene_ids_from_github
      # end
    end

    private

    def fetch_completed_scene_ids_from_github
      owner = "hackclub"
      repo  = "som-grand-survey-expedition"
      path  = "scenes"
      url   = "https://api.github.com/repos/#{owner}/#{repo}/contents/#{path}"

      headers = {
        "Accept" => "application/vnd.github+json",
        "User-Agent" => "isle-app"
      }

      # Prefer credentials, fall back to ENV if present (improves rate limits)
      token = Rails.application.credentials.dig(:github, :token) || ENV["GITHUB_TOKEN"] || ENV["GITHUB_PAT"]
      headers["Authorization"] = "Bearer #{token}" if token.present?
      headers["X-GitHub-Api-Version"] = "2022-11-28"

      resp = Faraday.get(url, nil, headers)
      raise "GitHub API error: #{resp.status}" unless resp.success?

      items = JSON.parse(resp.body)
      # Only directories correspond to completed scenes (scenes/[id])
      raw_ids = items.select { |i| i["type"] == "dir" }.map { |i| i["name"] }
      # Only allow numeric directory names (scene IDs)
      raw_ids.select { |name| name.match?(/^\d+$/) }.map(&:to_i)
    end
  end
end
