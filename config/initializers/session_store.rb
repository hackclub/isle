# Configure session cookies to work properly when site is embedded in iframes
Rails.application.config.session_store :cookie_store, key: "_isle_session", expire_after: 30.days

# Configure session cookie attributes for iframe compatibility
Rails.application.config.action_dispatch.cookies_same_site_protection = :none
Rails.application.config.action_dispatch.cookies_secure = Rails.env.production? || Rails.env.staging?

# Additional cookie configuration for iframe embedding
Rails.application.config.middleware.insert_before(
  ActionDispatch::Cookies,
  ActionDispatch::Session::CookieStore,
  Rails.application.config.session_options.merge(
    secure: Rails.application.config.action_dispatch.cookies_secure,
    same_site: :none,
  )
)
