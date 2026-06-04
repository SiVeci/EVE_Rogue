using System;
using System.IO;
using UnityEngine;
using EveRogue.Core;

namespace EveRogue.Save
{
    public sealed class SaveService
    {
        private readonly string savePath;
        private readonly string backupPath;

        public SaveService(string savePath)
        {
            this.savePath = savePath;
            backupPath = savePath + ".bak";
        }

        public bool Exists => File.Exists(savePath);

        public Result Save(PlayerSaveData data)
        {
            try
            {
                var directory = Path.GetDirectoryName(savePath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                if (File.Exists(savePath))
                {
                    File.Copy(savePath, backupPath, true);
                }

                var json = JsonUtility.ToJson(data, true);
                File.WriteAllText(savePath, json);
                return Result.Ok();
            }
            catch (Exception ex)
            {
                return Result.Fail($"Save failed: {ex.Message}");
            }
        }

        public Result<PlayerSaveData> Load()
        {
            var primary = TryLoad(savePath);
            if (primary.Success)
            {
                return primary;
            }

            if (File.Exists(backupPath))
            {
                var backup = TryLoad(backupPath);
                if (backup.Success)
                {
                    return backup;
                }
            }

            return primary;
        }

        private static Result<PlayerSaveData> TryLoad(string path)
        {
            try
            {
                if (!File.Exists(path))
                {
                    return Result<PlayerSaveData>.Fail($"Save file does not exist: {path}");
                }

                var data = JsonUtility.FromJson<PlayerSaveData>(File.ReadAllText(path));
                if (data == null)
                {
                    return Result<PlayerSaveData>.Fail("Save file is empty or invalid.");
                }

                return Result<PlayerSaveData>.Ok(data);
            }
            catch (Exception ex)
            {
                return Result<PlayerSaveData>.Fail($"Load failed: {ex.Message}");
            }
        }
    }
}
