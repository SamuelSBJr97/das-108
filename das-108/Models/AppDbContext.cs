using Microsoft.EntityFrameworkCore;

namespace das108api.Models
{
    public class VeiculoPerfil
    {
        public int VeiculoId { get; set; }
        public string Placa { get; set; } = string.Empty;
        public string Serie { get; set; } = string.Empty;
        public int PerfilId { get; set; }
    }

    public class EmpresaPerfil
    {
        public int EmpresaPerfilId { get; set; }
        public string PerfilDescricao { get; set; } = string.Empty;
    }

    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<VeiculoPerfil> Veiculos { get; set; }
        public DbSet<EmpresaPerfil> Perfis { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<VeiculoPerfil>().HasKey(v => v.VeiculoId);
            modelBuilder.Entity<EmpresaPerfil>().HasKey(e => e.EmpresaPerfilId);
        }
    }
}
