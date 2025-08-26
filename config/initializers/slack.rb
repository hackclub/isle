Slack::Events.configure do |config|
  config.signing_secret = Rails.application.credentials.dig(:slack, :signing_secret)
end

Slack.configure do |config|
  config.token = Rails.application.credentials.dig(:slack, :bot_token)
end
