using UnityEngine;

namespace EveRogue.UI
{
    public sealed class SafeZoneBootstrap : MonoBehaviour
    {
        public string SaveFileName = "eve_rogue_save.json";
        public SafeZonePresenter Presenter { get; private set; }
        public SafeZoneViewModel CurrentViewModel { get; private set; }

        private void Awake()
        {
            Presenter = SafeZonePresenter.CreateDefault(System.IO.Path.Combine(Application.persistentDataPath, SaveFileName));
            Refresh();
        }

        public void Refresh()
        {
            CurrentViewModel = Presenter.BuildViewModel();
        }
    }
}
