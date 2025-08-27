module Admin
  class ScenesController < Admin::ApplicationController
    before_action :set_scene, except: [:index]

    def index
      @scenes = Scene.all.order(id: :asc)
    end

    def show
    end

    def claim
      if @scene.claimed?
        flash[:error] = "already assigned to #{@scene.user.display_name}"
        redirect_to admin_scene_path(@scene)
        return
      end

      user = User.find_by(slack_id: params[:user_id]) || User.find_by(id: params[:user_id])
      if user.nil?
        flash[:error] = "no user found for #{params[:user_id].inspect}"
        redirect_to admin_scene_path(@scene)
        return
      end

      @scene.claim!(user)
      flash[:success] = "assigned to #{@scene.user.display_name} :-)"
      redirect_to admin_scene_path(@scene)
    end

    def unclaim
      @scene.unclaim!
      flash[:success] = "successfully unassigned..."
      redirect_to admin_scene_path(@scene)
    end

    private

    def set_scene
      @scene = Scene.find(params[:id])
    end
  end
end
