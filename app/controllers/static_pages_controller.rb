class StaticPagesController < ApplicationController
  skip_before_action :authenticate_user!, only: def index
  end
end
