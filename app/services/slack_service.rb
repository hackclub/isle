module SlackService
  CHAN = Rails.env.production? ? "dunno yet" : "C09C8SQV1N0"
  def self.client = @client ||= Slack::Web::Client.new
end