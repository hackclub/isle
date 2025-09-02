class ScenesController < ApplicationController
  def index
    @scenes = Scene.includes(:user).order(id: :asc)
  end
end
