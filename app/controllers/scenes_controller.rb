class ScenesController < ApplicationController
  before_action :set_scene, except: [:index]
  # skip_before_action :authenticate_user!, only: [:show]

  def index
    @scenes = Scene.includes(:user).order(id: :asc)
  end

  def show
  end

  private

  def set_scene
    @scene = Scene.includes(:user).find(params[:id])
  end
end
