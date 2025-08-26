module Admin
  class ApplicationController < ApplicationController
    before_action :authenticate_admin!

    private

    def authenticate_admin!
      redirect_to root_path, alert: "you can't do that" unless current_user&.is_admin?
    end
  end
end
