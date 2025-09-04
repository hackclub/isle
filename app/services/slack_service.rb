module SlackService
  CHAN = Rails.env.production? ? "C09DQ3EB40L" : "C09C8SQV1N0"

  class << self
    def client = @client ||= Slack::Web::Client.new

    def poast(options = {}) = client.chat_postMessage(options.merge(channel: CHAN))
  end
end
