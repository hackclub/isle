class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  before_action :ensure_not_banned!
  helper_method :current_user, :user_signed_in?, :current_impersonator, :impersonating?

  def current_user
    @current_user ||= User.find_by(id: session[:som_user_id]) if session[:som_user_id]
  end

  def current_impersonator
    @current_impersonator ||= User.find_by(id: session[:impersonator_user_id]) if session[:impersonator_user_id]
  end

  def user_signed_in? = !!current_user
  def impersonating? = !!current_impersonator

  def authenticate_user!
    redirect_to root_path, alert: "Please sign in to access this page" unless user_signed_in?
  end

  def ensure_not_banned!
    return unless current_user&.is_banned?
    render html: "womp womp"
  end
end
