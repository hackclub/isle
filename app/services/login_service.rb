module LoginService
  def self.verifier = @verifier ||= ActiveSupport::MessageVerifier.new(Rails.application.credentials.som_shared_secret)
end