class SlackpplicationController < ActionController::API
  before_action :verify_slack_request!
  include Pundit::Authorization

  def verify_slack_request!
    slack_request = Slack::Events::Request.new(request)
    slack_request.verify!
  end

  rescue_from Slack::Events::Request::MissingSigningSecret, Slack::Events::Request::TimestampExpired, Slack::Events::Request::InvalidSignature do |e|
    render json: { error: e.message, lol: "nice try" }, status: :bad_request
    Rails.logger.error "Slack request verification failed: #{e.message}"
  end
end